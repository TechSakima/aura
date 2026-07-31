import { nanoid } from "nanoid";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import {
  appendStudioDoc,
  ensureMigrated,
  getStudioDoc,
  patchStudioDoc,
} from "@/lib/db/store";
import { emailContactToStudio, notifyDeliveryIssue } from "@/lib/notify/send";
import type {
  ContactMessage,
  EmailOutboxJob,
  EmailOutboxPayload,
} from "@/lib/types";

/** Backoff after each failed attempt (AURA-313 / AURA-149). */
const EMAIL_BACKOFF_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
] as const;

const MAX_ATTEMPTS = EMAIL_BACKOFF_MS.length;

async function alertDeadEmail(opts: {
  studioId: string;
  title: string;
  reason: string;
  href: string;
}) {
  await notifyDeliveryIssue({
    studioId: opts.studioId,
    kind: "email",
    title: opts.title,
    body: opts.reason.slice(0, 200),
    href: opts.href,
  }).catch((err) => {
    console.error("[email-outbox] notify dead", err);
  });
}

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
    nextAttemptAt: new Date(Date.now() + EMAIL_BACKOFF_MS[0]).toISOString(),
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

/** Queue a rendered transactional email for retry (AURA-149). */
export async function enqueueTransactionalEmail(opts: {
  studioId: string;
  payload: EmailOutboxPayload;
  lastError?: string;
}): Promise<EmailOutboxJob> {
  const now = new Date().toISOString();
  const refId =
    opts.payload.idempotencyKey?.trim() ||
    `tx/${opts.studioId}/${nanoid(12)}`;
  const job: EmailOutboxJob = {
    id: nanoid(),
    studioId: opts.studioId,
    kind: "transactional",
    refId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(Date.now() + EMAIL_BACKOFF_MS[0]).toISOString(),
    lastError: opts.lastError,
    payload: opts.payload,
    createdAt: now,
    updatedAt: now,
  };
  await appendStudioDoc(COL.emailOutbox, job);
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
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Message email failed",
      reason: "Contact message missing",
      href: "/admin/settings/notifications",
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
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Message email failed",
      reason: "Studio missing",
      href: "/admin/settings/notifications",
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
    const skipErr = delivered.error || "Email skipped";
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      attempts,
      lastError: skipErr,
    });
    await patchStudioDoc(COL.contactMessages, message.id, {
      emailStatus: "skipped",
      emailLastError: skipErr,
    });
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Message email failed",
      reason: skipErr,
      href: "/admin/settings/notifications",
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
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Message email failed",
      reason: err,
      href: "/admin/settings/notifications",
    });
    return "dead";
  }

  const delay =
    EMAIL_BACKOFF_MS[Math.min(attempts, EMAIL_BACKOFF_MS.length - 1)]!;
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

async function processTransactionalOutboxJob(
  job: EmailOutboxJob,
): Promise<"sent" | "retry" | "dead" | "skip"> {
  if (job.kind !== "transactional") return "skip";
  const payload = job.payload;
  if (!payload?.to || !payload.subject || !payload.html) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      lastError: "Transactional payload missing",
      attempts: job.attempts + 1,
    });
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Email failed",
      reason: "Transactional payload missing",
      href: "/admin/settings/notifications",
    });
    return "dead";
  }

  const { emailClient } = await import("@/lib/notify/send");
  const attempts = job.attempts + 1;
  const delivered = await emailClient({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
    fromDisplayName: payload.fromDisplayName,
    idempotencyKey: payload.idempotencyKey,
    skipOutbox: true,
  });

  if (delivered.ok) {
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "sent",
      attempts,
      lastError: null,
    });
    return "sent";
  }

  if (delivered.skipped) {
    const skipErr = delivered.error || "Email skipped";
    await patchStudioDoc(COL.emailOutbox, job.id, {
      status: "dead",
      attempts,
      lastError: skipErr,
    });
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Email failed",
      reason: skipErr,
      href: "/admin/settings/notifications",
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
    await alertDeadEmail({
      studioId: job.studioId,
      title: "Email failed",
      reason: `${payload.subject}: ${err}`,
      href: "/admin/settings/notifications",
    });
    return "dead";
  }

  const delay =
    EMAIL_BACKOFF_MS[Math.min(attempts, EMAIL_BACKOFF_MS.length - 1)]!;
  await patchStudioDoc(COL.emailOutbox, job.id, {
    status: "pending",
    attempts,
    lastError: err,
    nextAttemptAt: new Date(Date.now() + delay).toISOString(),
  });
  return "retry";
}

/**
 * Process due outbox jobs (contact + transactional). O(pending scanned).
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
      const result =
        job.kind === "transactional"
          ? await processTransactionalOutboxJob(job)
          : await processContactOutboxJob(job);
      if (result === "sent") sent += 1;
      else if (result === "dead") dead += 1;
    } catch (err) {
      console.error("[email-outbox] job failed", job.id, err);
    }
  }

  return { processed: due.length, sent, dead };
}

/** Count dead email jobs for dashboard attention (AURA-279). */
export async function countDeadContactOutbox(
  studioId: string,
): Promise<number> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  try {
    const snap = await db
      .collection(COL.emailOutbox)
      .where("studioId", "==", studioId)
      .where("status", "==", "dead")
      .limit(50)
      .get();
    return snap.size;
  } catch (err) {
    console.error("[email-outbox] count dead", err);
    return 0;
  }
}
