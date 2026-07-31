import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { contactNotifyHref } from "@/lib/admin-deep-links";
import { COL } from "@/lib/db/collections";
import { appendStudioDoc, patchStudioDoc } from "@/lib/db/store";
import {
  drainEmailOutbox,
  enqueueContactEmailOutbox,
} from "@/lib/email-outbox";
import {
  emailContactAutoReply,
  emailContactToStudio,
  notifyStudio,
} from "@/lib/notify/send";
import {
  buildContactMessage,
  contactSourceLabel,
  isContactTimeTrap,
  parsePublicContactBody,
  readPublicContactJson,
  resolveContactStudio,
} from "@/lib/public-contact-server";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const raw = await readPublicContactJson(req);
  if (!raw.ok) {
    return NextResponse.json(
      { error: raw.error },
      { status: raw.status },
    );
  }

  const parsed = parsePublicContactBody(raw.body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot / time-trap — silent success so bots don’t learn the field.
  if (data.company || isContactTimeTrap(data.startedAt)) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(req);
  const ipLimit = await rateLimitShared(`contact-ip:${ip}`, 5, 10 * 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many messages. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSec) },
      },
    );
  }

  const emailLimit = await rateLimitShared(
    `contact-email:${data.email}`,
    3,
    30 * 60_000,
  );
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: "Too many messages. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(emailLimit.retryAfterSec) },
      },
    );
  }

  const resolved = await resolveContactStudio(data);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }
  const { studio, gallery } = resolved.resolved;

  const studioLimit = await rateLimitShared(
    `contact-studio:${studio.id}`,
    30,
    60 * 60_000,
  );
  if (!studioLimit.ok) {
    return NextResponse.json(
      { error: "Too many messages. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(studioLimit.retryAfterSec) },
      },
    );
  }

  const id = nanoid();
  const message = buildContactMessage(id, studio.id, data, gallery);
  await appendStudioDoc(COL.contactMessages, message);

  const delivered = await emailContactToStudio({ studio, message });
  if (delivered.ok) {
    await patchStudioDoc(COL.contactMessages, id, { emailStatus: "sent" });
  } else if (delivered.skipped) {
    await patchStudioDoc(COL.contactMessages, id, {
      emailStatus: "skipped",
      emailLastError: delivered.error || "Email skipped",
    });
    console.error("[contact] deliver skipped", studio.id, id, delivered.error);
    return NextResponse.json(
      { error: "Couldn't send — try again" },
      { status: 502 },
    );
  } else {
    // Accept message; durable retry via outbox (AURA-313).
    console.error("[contact] deliver failed — queued", studio.id, id, delivered.error);
    await enqueueContactEmailOutbox({
      studioId: studio.id,
      contactMessageId: id,
      lastError: delivered.error,
    });
  }

  // In-app bell + dashboard even when email is still queued.
  if (studio.notificationPrefs?.emailContactMessage !== false) {
    const sourceLabel = contactSourceLabel(data.source);
    const preview =
      data.message.length > 120
        ? `${data.message.slice(0, 117)}…`
        : data.message;

    await notifyStudio({
      studioId: studio.id,
      type: "contact_message",
      title: `Message from ${data.name}`,
      body: `${sourceLabel} · ${data.email}${preview ? ` — ${preview}` : ""}`,
      href: contactNotifyHref({
        projectId: message.projectId,
        sessionId: message.sessionId,
        contactMessageId: message.id,
      }),
      emailStudio: false,
    });
  }

  // Optional client confirmation (AURA-314) — never fail the submit.
  const autoReply = await emailContactAutoReply({ studio, message });
  if (!autoReply.ok && !autoReply.skipped) {
    console.error(
      "[contact] auto-reply failed",
      studio.id,
      id,
      autoReply.error,
    );
  }

  // Opportunistic drain of due jobs (other studios / prior failures).
  void drainEmailOutbox({ limit: 5 }).catch((err) => {
    console.error("[contact] outbox drain", err);
  });

  return NextResponse.json({ ok: true, id });
}
