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
  // Prefer studio display name; always keep the verified notify@ address.
  if (studioName && studioName.trim()) {
    const email = raw.includes("<")
      ? raw.match(/<([^>]+)>/)?.[1]
      : raw.trim();
    if (email) return `${studioName.trim()} <${email}>`;
  }
  return raw;
}

function isPublicHost(hostname: string) {
  return (
    hostname !== "0.0.0.0" &&
    hostname !== "127.0.0.1" &&
    hostname !== "localhost" &&
    !hostname.endsWith(".internal")
  );
}

/** Public site origin — never use Cloud Run / App Hosting internal req.url. */
export function appOrigin() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      const cleaned = raw.replace(/\/$/, "");
      const host = new URL(cleaned).hostname;
      if (isPublicHost(host)) return cleaned;
    } catch {
      /* try next */
    }
  }

  return process.env.NODE_ENV === "production"
    ? "https://aura.stroburm.app"
    : "http://localhost:3000";
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      if (isPublicHost(u.hostname)) return path;
      // Rebuild with public origin if someone baked in 0.0.0.0
      return `${appOrigin()}${u.pathname}${u.search}${u.hash}`;
    } catch {
      /* fall through */
    }
  }
  return `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function wrapHtml(opts: {
  studioName: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const cta =
    opts.ctaHref && opts.ctaLabel
      ? `<p style="margin:28px 0 8px"><a href="${opts.ctaHref}" style="display:inline-block;padding:12px 20px;background:#1c1915;color:#f7f5f1;text-decoration:none;font-size:14px;letter-spacing:0.04em">${opts.ctaLabel}</a></p>`
      : "";
  const footerLink =
    opts.ctaHref && !opts.ctaLabel
      ? `<p style="margin-top:16px;font-size:13px;word-break:break-all"><a href="${opts.ctaHref}" style="color:#1c1915">${opts.ctaHref}</a></p>`
      : opts.ctaHref
        ? `<p style="margin-top:20px;font-size:12px;color:#6b6560;word-break:break-all">${opts.ctaHref}</p>`
        : "";
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f1ed">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1ed;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;padding:36px 32px;border:1px solid #e8e4de">
          <tr>
            <td style="font-family:Georgia,'Iowan Old Style',serif;color:#1c1915;line-height:1.55">
              <p style="margin:0 0 20px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6560">${opts.studioName}</p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:normal;line-height:1.25">${opts.title}</h1>
              <div style="font-size:16px;color:#2a2622">${opts.bodyHtml}</div>
              ${cta}
              ${footerLink}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  let studioName = "Aura";
  let prefs: Studio["notificationPrefs"];

  await updateStudioDb(opts.studioId, (db) => {
    ownerEmail = db.studio.ownerEmail;
    studioName = db.studio.name || "Aura";
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
      fromDisplayName: studioName,
      html: wrapHtml({
        studioName,
        title: opts.title,
        bodyHtml: `<p>${opts.body}</p>`,
        ctaLabel: href ? "Open" : undefined,
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

/** Client: payment link to pay */
export async function emailPaymentLink(opts: {
  studioId: string;
  to: string;
  clientName?: string;
  title: string;
  paymentLinkId: string;
  publicUrl?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("payment", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const href = opts.publicUrl || absoluteUrl(`/pay/${opts.paymentLinkId}`);
  const who = opts.clientName || "there";
  return emailClient({
    to: opts.to,
    subject: `Payment link — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: opts.title,
      bodyHtml: `<p>Hi ${who},</p><p>Please use the link below to complete your payment.</p>`,
      ctaLabel: "Pay now",
      ctaHref: href,
    }),
    text: `Hi ${who},\n\nPlease complete your payment:\n${href}`,
    idempotencyKey: `payment-link/${opts.paymentLinkId}/${opts.to}`,
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

/** Client: contract ready to sign */
export async function emailContractToSign(opts: {
  studioId: string;
  to: string;
  clientName?: string;
  title: string;
  token: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const href = absoluteUrl(`/c/${opts.token}`);
  const who = opts.clientName || "there";
  return emailClient({
    to: opts.to,
    subject: `Please sign: ${opts.title}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: opts.title,
      bodyHtml: `<p>Hi ${who},</p><p>Please review and sign your agreement.</p>`,
      ctaLabel: "Sign now",
      ctaHref: href,
    }),
    text: `Hi ${who},\n\nPlease review and sign your agreement:\n${href}`,
    idempotencyKey: `contract-sign/${opts.token}`,
  });
}

/** Client: questionnaire invite */
export async function emailQuestionnaireInvite(opts: {
  studioId: string;
  to: string;
  clientName: string;
  title: string;
  token: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const href = absoluteUrl(`/q/${opts.token}`);
  return emailClient({
    to: opts.to,
    subject: `${opts.title} — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: opts.title,
      bodyHtml: `<p>Hi ${opts.clientName},</p><p>Please complete this questionnaire when you have a moment.</p>`,
      ctaLabel: "Open questionnaire",
      ctaHref: href,
    }),
    text: `Hi ${opts.clientName},\n\nPlease complete this questionnaire:\n${href}`,
    idempotencyKey: `questionnaire/${opts.token}`,
  });
}

/** Client: booking confirmation after studio confirms */
export async function emailBookingConfirmed(opts: {
  studioId: string;
  to: string;
  clientName: string;
  sessionTypeName: string;
  startsAt: string;
  cancelHref?: string;
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
  const cancelBit = opts.cancelHref
    ? `<p style="margin-top:24px;font-size:13px;opacity:0.75"><a href="${opts.cancelHref}" style="color:inherit">Need to cancel?</a></p>`
    : "";
  return emailClient({
    to: opts.to,
    subject: `Booking confirmed — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: "You're booked",
      bodyHtml: `<p>Hi ${opts.clientName},</p>
<p>Your <strong>${opts.sessionTypeName}</strong> is confirmed for <strong>${when}</strong>.</p>${cancelBit}`,
    }),
    idempotencyKey: `booking-confirmed/${opts.studioId}/${opts.to}/${opts.startsAt}`,
  });
}

/** Client: booking declined with studio reason */
export async function emailBookingDeclined(opts: {
  studioId: string;
  to: string;
  clientName: string;
  sessionTypeName: string;
  reason: string;
}) {
  const db = await readStudioDb(opts.studioId);
  return emailClient({
    to: opts.to,
    subject: `Booking update — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: db.studio.ownerEmail,
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Request update",
      bodyHtml: `<p>Hi ${opts.clientName},</p>
<p>We can’t take your <strong>${opts.sessionTypeName}</strong> request.</p>
<p>${opts.reason}</p>`,
    }),
    text: `Hi ${opts.clientName},\n\nWe can’t take your ${opts.sessionTypeName} request.\n\n${opts.reason}`,
    idempotencyKey: `booking-declined/${opts.studioId}/${opts.to}/${Date.now()}`,
  });
}

/** Studio: inquirer canceled */
export async function emailStudioBookingCanceled(opts: {
  studioId: string;
  clientName: string;
  sessionTypeName: string;
  reason: string;
  projectHref?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const to = db.studio.ownerEmail;
  if (!to) return { ok: false as const, skipped: true };
  return emailClient({
    to,
    subject: `Canceled: ${opts.clientName} — ${db.studio.name}`,
    fromDisplayName: "Aura",
    replyTo: undefined,
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Request canceled",
      bodyHtml: `<p><strong>${opts.clientName}</strong> canceled their <strong>${opts.sessionTypeName}</strong> request.</p>
<p>Reason: ${opts.reason}</p>`,
      ...(opts.projectHref
        ? { ctaLabel: "Open project", ctaHref: absoluteUrl(opts.projectHref) }
        : {}),
    }),
    idempotencyKey: `booking-canceled-studio/${opts.studioId}/${opts.clientName}/${Date.now()}`,
  });
}

