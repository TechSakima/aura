import { nanoid } from "nanoid";
import { Resend } from "resend";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import type { Studio } from "@/lib/types";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(studioName?: string) {
  const raw =
    process.env.RESEND_FROM_EMAIL || "Aura <notify@aura.stroburm.app>";
  // When From is bare email, wrap with studio display name for client mail
  if (studioName && !raw.includes("<")) {
    return `${studioName} <${raw}>`;
  }
  if (studioName && raw.includes("<")) {
    const email = raw.match(/<([^>]+)>/)?.[1];
    if (email) return `${studioName} <${email}>`;
  }
  return raw;
}

export function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function wrapHtml(opts: {
  studioName: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const cta =
    opts.ctaHref && opts.ctaLabel
      ? `<p style="margin:24px 0"><a href="${opts.ctaHref}" style="display:inline-block;padding:12px 18px;background:#1d1d1d;color:#fff;text-decoration:none;border-radius:4px">${opts.ctaLabel}</a></p>`
      : "";
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#1d1d1d;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#666">${opts.studioName}</p>
<h1 style="font-size:24px;font-weight:normal;margin:8px 0 16px">${opts.title}</h1>
${opts.bodyHtml}
${cta}
</body></html>`;
}

export async function emailClient(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromDisplayName?: string;
  idempotencyKey?: string;
}) {
  const resend = resendClient();
  if (!resend) {
    console.warn("[notify] RESEND_API_KEY missing — skip email");
    return { ok: false as const, skipped: true };
  }
  const { data, error } = await resend.emails.send(
    {
      from: fromAddress(opts.fromDisplayName),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, " "),
      replyTo: opts.replyTo,
    },
    opts.idempotencyKey
      ? { idempotencyKey: opts.idempotencyKey }
      : undefined,
  );
  if (error) {
    console.error("[notify] email failed", error.message);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, id: data?.id };
}

export async function notifyStudio(opts: {
  studioId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  /** When true (default), also email studio owner if prefs allow for this type */
  emailStudio?: boolean;
}) {
  const id = nanoid();
  const createdAt = new Date().toISOString();
  let ownerEmail: string | undefined;
  let prefs: Studio["notificationPrefs"];

  await updateStudioDb(opts.studioId, (db) => {
    ownerEmail = db.studio.ownerEmail;
    prefs = db.studio.notificationPrefs;
    db.notifications.unshift({
      id,
      studioId: opts.studioId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      href: opts.href,
      read: false,
      createdAt,
    });
  });

  const shouldEmail =
    opts.emailStudio !== false &&
    ownerEmail &&
    studioEmailAllowed(opts.type, prefs);

  if (shouldEmail && ownerEmail) {
    const href = opts.href ? absoluteUrl(opts.href) : undefined;
    await emailClient({
      to: ownerEmail,
      subject: opts.title,
      html: wrapHtml({
        studioName: "Aura",
        title: opts.title,
        bodyHtml: `<p>${opts.body}</p>`,
        ctaLabel: href ? "Open in Aura" : undefined,
        ctaHref: href,
      }),
      text: `${opts.body}${href ? `\n${href}` : ""}`,
      idempotencyKey: `studio-notify/${opts.studioId}/${opts.type}/${id}`,
    });
  }

  return { id };
}

function studioEmailAllowed(
  type: string,
  prefs: Studio["notificationPrefs"] | undefined,
) {
  if (!prefs) return true;
  if (type === "quote_accepted" || type === "proposal_accept") {
    return prefs.emailQuoteAccepted !== false;
  }
  if (type === "payment_received") {
    return prefs.emailPaymentReceived !== false;
  }
  if (
    type === "booking_submitted" ||
    type === "booking_confirmed" ||
    type === "booking_declined"
  ) {
    return prefs.emailBookingSubmitted !== false;
  }
  return true;
}

function clientEmailAllowed(
  kind: "quote" | "gallery" | "payment" | "booking",
  prefs: Studio["notificationPrefs"] | undefined,
) {
  if (!prefs) return true;
  if (kind === "quote") return prefs.emailClientQuote !== false;
  if (kind === "gallery") return prefs.emailClientGallery !== false;
  if (kind === "payment") return prefs.emailClientPayment !== false;
  if (kind === "booking") return prefs.emailClientBooking !== false;
  return true;
}

/** Client: quote link shared */
export async function emailQuoteShared(opts: {
  studioId: string;
  to: string;
  clientName: string;
  quoteTitle: string;
  token: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("quote", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const href = absoluteUrl(`/p/${opts.token}`);
  return emailClient({
    to: opts.to,
    subject: `Your quote from ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: opts.quoteTitle,
      bodyHtml: `<p>Hi ${opts.clientName},</p><p>Your quote is ready to review.</p>`,
      ctaLabel: "View quote",
      ctaHref: href,
    }),
    idempotencyKey: `quote-shared/${opts.token}`,
  });
}

/** Studio: quote accepted */
export async function notifyQuoteAccepted(opts: {
  studioId: string;
  proposalId: string;
  projectId?: string;
  title: string;
  clientName?: string;
}) {
  return notifyStudio({
    studioId: opts.studioId,
    type: "quote_accepted",
    title: "Quote accepted",
    body: opts.clientName
      ? `${opts.clientName} accepted “${opts.title}”`
      : `“${opts.title}” was accepted`,
    href: opts.projectId
      ? `/admin/projects/${opts.projectId}`
      : "/admin/projects",
  });
}

/** Client: gallery is live */
export async function emailGalleryLive(opts: {
  studioId: string;
  to: string;
  clientName: string;
  galleryTitle: string;
  publicToken: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("gallery", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const href = absoluteUrl(`/g/${opts.publicToken}`);
  return emailClient({
    to: opts.to,
    subject: `Your gallery from ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: opts.galleryTitle,
      bodyHtml: `<p>Hi ${opts.clientName},</p><p>Your gallery is ready to view.</p>`,
      ctaLabel: "Open gallery",
      ctaHref: href,
    }),
    idempotencyKey: `gallery-live/${opts.publicToken}`,
  });
}

/** Client: payment receipt */
export async function emailPaymentReceipt(opts: {
  studioId: string;
  to: string;
  clientName?: string;
  title: string;
  netAmount: number;
  grossAmount: number;
  processingFee: number;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("payment", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const who = opts.clientName || "there";
  return emailClient({
    to: opts.to,
    subject: `Payment receipt — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Payment received",
      bodyHtml: `<p>Hi ${who},</p>
<p>Thanks for your payment for <strong>${opts.title}</strong>.</p>
<ul>
<li>Amount to studio: $${opts.netAmount.toFixed(2)}</li>
<li>Processing fee: $${opts.processingFee.toFixed(2)}</li>
<li>You paid: $${opts.grossAmount.toFixed(2)}</li>
</ul>`,
    }),
    idempotencyKey: `payment-receipt/${opts.studioId}/${opts.to}/${opts.netAmount}/${Date.now()}`,
  });
}

/** Client: booking confirmation after studio confirms */
export async function emailBookingConfirmed(opts: {
  studioId: string;
  to: string;
  clientName: string;
  sessionTypeName: string;
  startsAt: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("booking", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const when = new Date(opts.startsAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return emailClient({
    to: opts.to,
    subject: `Booking confirmed — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: "You're booked",
      bodyHtml: `<p>Hi ${opts.clientName},</p>
<p>Your <strong>${opts.sessionTypeName}</strong> is confirmed for <strong>${when}</strong>.</p>`,
    }),
    idempotencyKey: `booking-confirmed/${opts.studioId}/${opts.to}/${opts.startsAt}`,
  });
}
