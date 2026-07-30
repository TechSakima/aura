import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import {
  appendStudioDoc,
  ensureMigrated,
  getStudioDoc,
  patchStudioDoc,
} from "@/lib/db/store";
import { emailContactToStudio } from "@/lib/notify/send";
import type { ContactMessage, EmailOutboxJob } from "@/lib/types";

/** Backoff after each failed attempt (AURA-313). */
const CONTACT_BACKOFF_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
] as const;

const MAX_ATTEMPTS = CONTACT_BACKOFF_MS.length;

export async function getContactMessage(
  id: string,
): Promise<ContactMessage | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db.collection(COL.contactMessages).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as ContactMessage;
}

/** Queue Resend retry for a contact message (AURA-313). */
export async function enqueueContactEmailOutbox(opts: {
  studioId: string;
  contactMessageId: string;
  lastError?: string;
}): Promise<EmailOutboxJob> {
  const now = new Date().toISOString();
  const job: EmailOutboxJob = {
    id: nanoid(),
    studioId: opts.studioId,
    kind: "contact_message",
    refId: opts.contactMessageId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(Date.now() + CONTACT_BACKOFF_MS[0]).toISOString(),
    lastError: opts.lastError,
    createdAt: now,
    updatedAt: now,
  };
  await appendStudioDoc(COL.emailOutbox, job);
  await patchStudioDoc(COL.contactMessages, opts.contactMessageId, {
    emailStatus: "queued",
    emailLastError: opts.lastError,
  });
  return job;
}

async function processContactOutboxJob(
  job: EmailOutboxJob,
): Promise<"sent" | "retry" | "dead" | "skip"> {
  if (job.kind !== "contact_message") return "skip";

  const message = await getContactMessage(job.refId);
  if (!message) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      lastError: "Contact message missing",
      attempts: job.attempts + 1,
    });
    return "dead";
  }
  if (message.emailStatus === "sent") {
    await patchStudioDoc(COL.emailOutbox, job.id, { status: "sent" });
    return "sent";
  }

  const studio = await getStudioDoc(job.studioId);
  if (!studio) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      lastError: "Studio missing",
      attempts: job.attempts + 1,
    });
    return "dead";
  }

  const attempts = job.attempts + 1;
  const delivered = await emailContactToStudio({ studio, message });
  if (delivered.ok) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "sent",
      attempts,
      lastError: null,
    });
    await patchStudioDoc(COL.contactMessages, message.id, {
      emailStatus: "sent",
      emailLastError: null,
    });
    return "sent";
  }

  if (delivered.skipped) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      attempts,
      lastError: delivered.error || "Email skipped",
    });
    await patchStudioDoc(COL.contactMessages, message.id, {
      emailStatus: "skipped",
      emailLastError: delivered.error || "Email skipped",
    });
    return "dead";
  }

  const err = delivered.error || "Send failed";
  if (attempts >= MAX_ATTEMPTS) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      attempts,
      lastError: err,
    });
    await patchStudioDoc(COL.contactMessages, message.id, {
      emailStatus: "failed",
      emailLastError: err,
    });
    return "dead";
  }

  const delay =
    CONTACT_BACKOFF_MS[Math.min(attempts, CONTACT_BACKOFF_MS.length - 1)]!;
  await patchStudioDoc(COL.emailOutbox, job.id, {
    status: "pending",
    attempts,
    lastError: err,
    nextAttemptAt: new Date(Date.now() + delay).toISOString(),
  });
  await patchStudioDoc(COL.contactMessages, message.id, {
    emailStatus: "queued",
    emailLastError: err,
  });
  return "retry";
}

/**
 * Process due outbox jobs. Contact-only for AURA-313; AURA-149 widens kinds.
 * O(pending jobs scanned), not full studio RMW.
 */
export async function drainEmailOutbox(opts?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; dead: number }> {
  const limit = Math.max(1, Math.min(opts?.limit ?? 10, 40));
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.emailOutbox)
    .where("status", "==", "pending")
    .limit(50)
    .get();

  const now = Date.now();
  const due = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as EmailOutboxJob)
    .filter((j) => {
      const t = new Date(j.nextAttemptAt).getTime();
      return Number.isFinite(t) && t <= now;
    })
    .sort((a, b) => a.nextAttemptAt.localeCompare(b.nextAttemptAt))
    .slice(0, limit);

  let sent = 0;
  let dead = 0;
  for (const job of due) {
    try {
      const result = await processContactOutboxJob(job);
      if (result === "sent") sent += 1;
      else if (result === "dead") dead += 1;
    } catch (err) {
      console.error("[email-outbox] job failed", job.id, err);
    }
  }

  return { processed: due.length, sent, dead };
}
