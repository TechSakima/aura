import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import { appendStudioDoc, patchStudioDoc } from "@/lib/db/store";
import {
  enqueueContactEmailOutbox,
  getContactMessage,
} from "@/lib/email-outbox";
import { emailContactToStudio, notifyStudio } from "@/lib/notify/send";
import { rateLimit } from "@/lib/rate-limit";
import {
  extractFromAddress,
  inboundContactMessageId,
  inboundNotifyHref,
  parseInboundAddressParts,
  resendInboundClient,
  resolveInboundRoute,
  sanitizeInboundBody,
} from "@/lib/resend-inbound";
import type { ContactMessage } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Resend inbound webhook (AURA-315 / AURA-371).
 * Requires RESEND_WEBHOOK_SECRET + RESEND_INBOUND_DOMAIN for email.received routing.
 * Addresses: `{homepageSlug}@domain`, `s-{studioId}@domain`,
 * `p-{projectId}@domain`, `sess-{sessionId}@domain`.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const resend = resendInboundClient();
  if (!resend) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 503 },
    );
  }

  const payload = await req.text();
  if (payload.length > 256_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const headerId =
    req.headers.get("svix-id") || req.headers.get("webhook-id") || "";
  const headerTs =
    req.headers.get("svix-timestamp") ||
    req.headers.get("webhook-timestamp") ||
    "";
  const headerSig =
    req.headers.get("svix-signature") ||
    req.headers.get("webhook-signature") ||
    "";

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: headerId,
        timestamp: headerTs,
        signature: headerSig,
      },
      webhookSecret: secret,
    });
  } catch (err) {
    console.error("[resend-webhook] verify failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const emailId = String(event.data.email_id || "").trim();
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  const idLimit = rateLimit(`resend-inbound:${emailId}`, 3, 60 * 60_000);
  if (!idLimit.ok) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const messageId = inboundContactMessageId(emailId);
  const existing = await getContactMessage(messageId);
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true, id: messageId });
  }

  const { data: received, error: fetchError } =
    await resend.emails.receiving.get(emailId);
  if (fetchError || !received) {
    console.error("[resend-webhook] receiving.get failed", emailId, fetchError);
    return NextResponse.json({ error: "Could not load email" }, { status: 502 });
  }

  const toParts = parseInboundAddressParts([
    ...(Array.isArray(received.to) ? received.to : [received.to]),
    ...(Array.isArray(received.cc)
      ? received.cc
      : received.cc
        ? [received.cc]
        : []),
    ...(Array.isArray(event.data.received_for) ? event.data.received_for : []),
  ]);
  const route = await resolveInboundRoute(toParts);
  if (!route) {
    console.warn(
      "[resend-webhook] no studio for recipients",
      toParts.map((p) => p.addr),
    );
    return NextResponse.json({ ok: true, unmatched: true });
  }
  const { studio, projectId, sessionId } = route;

  const from = extractFromAddress(received.from ?? event.data.from);
  if (!from.email.includes("@")) {
    console.warn("[resend-webhook] bad from", received.from);
    return NextResponse.json({ ok: true, rejected: "from" });
  }

  const fromLimit = rateLimit(
    `resend-inbound-from:${studio.id}:${from.email}`,
    20,
    60 * 60_000,
  );
  if (!fromLimit.ok) {
    console.warn("[resend-webhook] rate limited", studio.id, from.email);
    return NextResponse.json({ ok: true, rateLimited: true });
  }

  const { message: body, context } = sanitizeInboundBody({
    text: received.text,
    html: received.html,
    subject: received.subject ?? event.data.subject,
  });

  const now = new Date().toISOString();
  const message: ContactMessage = {
    id: messageId,
    studioId: studio.id,
    source: "other",
    name: from.name.slice(0, 120),
    email: from.email.slice(0, 254),
    message: body,
    context,
    ...(projectId ? { projectId } : {}),
    ...(sessionId ? { sessionId } : {}),
    emailStatus: "pending",
    createdAt: now,
  };

  await appendStudioDoc(COL.contactMessages, message);

  const delivered = await emailContactToStudio({ studio, message });
  if (delivered.ok) {
    await patchStudioDoc(COL.contactMessages, messageId, {
      emailStatus: "sent",
    });
  } else if (delivered.skipped) {
    await patchStudioDoc(COL.contactMessages, messageId, {
      emailStatus: "skipped",
      emailLastError: delivered.error || "Email skipped",
    });
  } else {
    await enqueueContactEmailOutbox({
      studioId: studio.id,
      contactMessageId: messageId,
      lastError: delivered.error,
    });
  }

  if (studio.notificationPrefs?.emailContactMessage !== false) {
    const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
    const scope = projectId ? "Project" : "Inbound";
    await notifyStudio({
      studioId: studio.id,
      type: "contact_message",
      title: `Email from ${from.name}`,
      body: `${scope} · ${from.email}${preview ? ` — ${preview}` : ""}`,
      href: inboundNotifyHref({ projectId, sessionId }),
      emailStudio: false,
    });
  }

  return NextResponse.json({
    ok: true,
    id: messageId,
    studioId: studio.id,
    ...(projectId ? { projectId } : {}),
    ...(sessionId ? { sessionId } : {}),
  });
}
