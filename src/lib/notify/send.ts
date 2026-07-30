import { nanoid } from "nanoid";
import { Resend } from "resend";
import {
  bookingCanceledStudioSentence,
  bookingConfirmedSentence,
  bookingDeclinedSentence,
  nextStepAfterBookingConfirm,
  nextStepHtml,
  offeringLabel,
} from "@/lib/copy/offering";
import {
  DEFAULT_CONTACT_AUTO_REPLY,
  studioContactPrefs,
  studioContactRecipientEmail,
} from "@/lib/contact-prefs";
import { readStudioDb, appendStudioDoc, getStudioDoc } from "@/lib/db/store";
import { COL } from "@/lib/db/collections";
import { contactSourceLabel } from "@/lib/public-contact-server";
import { clientTransactionalReplyTo } from "@/lib/resend-inbound";
import type { ContactMessage, Studio, StudioNotification } from "@/lib/types";

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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSignedDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
      ? `<p style="margin:28px 0 8px"><a href="${escapeHtml(opts.ctaHref)}" style="display:inline-block;padding:12px 20px;background:#1c1915;color:#f7f5f1;text-decoration:none;font-size:14px;letter-spacing:0.04em">${escapeHtml(opts.ctaLabel)}</a></p>`
      : "";
  const footerLink =
    opts.ctaHref && !opts.ctaLabel
      ? `<p style="margin-top:16px;font-size:13px;word-break:break-all"><a href="${escapeHtml(opts.ctaHref)}" style="color:#1c1915">${escapeHtml(opts.ctaHref)}</a></p>`
      : opts.ctaHref
        ? `<p style="margin-top:20px;font-size:12px;color:#6b6560;word-break:break-all">${escapeHtml(opts.ctaHref)}</p>`
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
              <p style="margin:0 0 20px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6560">${escapeHtml(opts.studioName)}</p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:normal;line-height:1.25">${escapeHtml(opts.title)}</h1>
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
    return {
      ok: false as const,
      skipped: true,
      error: "RESEND_API_KEY missing",
    };
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
  const studio = await getStudioDoc(opts.studioId);
  const ownerEmail = studio?.ownerEmail;
  const studioName = studio?.name || "Aura";
  const prefs = studio?.notificationPrefs;

  const notification: StudioNotification = {
    id,
    studioId: opts.studioId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    href: opts.href,
    read: false,
    createdAt,
  };
  await appendStudioDoc(COL.notifications, notification);

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
      bodyHtml: `<p>${escapeHtml(opts.body)}</p>`,
      ctaLabel: href ? "Open" : undefined,
      ctaHref: href,
    }),
      text: `${opts.body}${href ? `\n${href}` : ""}`,
      idempotencyKey: `studio-notify/${opts.studioId}/${opts.type}/${id}`,
    });
  }

  return { id };
}

/**
 * In-app alert for delivery failures (email / payments / calendar).
 * Never emails the studio about email failures (avoids retry loops).
 */
export async function notifyDeliveryIssue(opts: {
  studioId: string;
  kind: "email" | "calendar" | "payments";
  title: string;
  body: string;
  href: string;
}) {
  return notifyStudio({
    studioId: opts.studioId,
    type: `delivery_${opts.kind}`,
    title: opts.title,
    body: opts.body,
    href: opts.href,
    emailStudio: opts.kind !== "email",
  });
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
  if (type === "contact_message") {
    return prefs.emailContactMessage !== false;
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
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("quote", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const href = absoluteUrl(`/p/${opts.token}`);
  const rawLabel = offeringLabel(
    opts.quoteTitle.replace(/\s*quote$/i, "").trim() || opts.quoteTitle,
  );
  const showLabel =
    rawLabel &&
    rawLabel.toLowerCase() !== "quote" &&
    rawLabel.toLowerCase() !== "session";
  return emailClient({
    to: opts.to,
    subject: `Your quote — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Your quote",
      bodyHtml: `<p>Hi ${escapeHtml(opts.clientName)},</p>
<p>Your quote is ready to review${showLabel ? ` · ${escapeHtml(rawLabel)}` : ""}.</p>
${nextStepHtml("Open the link, choose a package if shown, and accept when you're ready.")}`,
      ctaLabel: "View quote",
      ctaHref: href,
    }),
    text: `Hi ${opts.clientName},\n\nYour quote is ready to review${showLabel ? ` · ${rawLabel}` : ""}.\n\nNext: Open the link, choose a package if shown, and accept when you're ready.\n${href}`,
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
      ? `/admin/projects/${opts.projectId}#workflow`
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
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("gallery", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const href = absoluteUrl(`/g/${opts.publicToken}`);
  return emailClient({
    to: opts.to,
    subject: `Your gallery — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Your gallery",
      bodyHtml: `<p>Hi ${escapeHtml(opts.clientName)},</p>
<p>Your gallery is ready to view${opts.galleryTitle ? ` (${escapeHtml(offeringLabel(opts.galleryTitle))})` : ""}.</p>
${nextStepHtml("Open the gallery to view, favorite, and download your photos.")}`,
      ctaLabel: "Open gallery",
      ctaHref: href,
    }),
    text: `Hi ${opts.clientName},\n\nYour gallery is ready.\n\nNext: Open the gallery to view, favorite, and download your photos.\n${href}`,
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
  /** Only say “secures your date” when this link is for a booking deposit */
  isDeposit?: boolean;
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("payment", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const href = opts.publicUrl || absoluteUrl(`/pay/${opts.paymentLinkId}`);
  const who = opts.clientName || "there";
  const next = opts.isDeposit
    ? "Use the button below to pay securely. This secures your date."
    : "Use the button below to pay securely.";
  return emailClient({
    to: opts.to,
    subject: `Payment — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Payment",
      bodyHtml: `<p>Hi ${escapeHtml(who)},</p>
<p>Please complete your payment${opts.title ? ` · ${escapeHtml(offeringLabel(opts.title))}` : ""}.</p>
${nextStepHtml(next)}`,
      ctaLabel: "Pay now",
      ctaHref: href,
    }),
    text: `Hi ${who},\n\nPlease complete your payment.\n\nNext: ${next}\n${href}`,
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
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  if (!clientEmailAllowed("payment", db.studio.notificationPrefs)) {
    return { ok: false as const, skipped: true };
  }
  const who = opts.clientName || "there";
  return emailClient({
    to: opts.to,
    subject: `Payment received — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Payment received",
      bodyHtml: `<p>Hi ${escapeHtml(who)},</p>
<p>Thanks — we received your payment${opts.title ? ` · ${escapeHtml(offeringLabel(opts.title))}` : ""}.</p>
<ul>
<li>Amount to studio: $${opts.netAmount.toFixed(2)}</li>
<li>Processing fee: $${opts.processingFee.toFixed(2)}</li>
<li>You paid: $${opts.grossAmount.toFixed(2)}</li>
</ul>
${nextStepHtml("You're all set on payment. We'll be in touch with prep details closer to your date.")}`,
    }),
    text: `Hi ${who},\n\nThanks — we received your payment.\nYou paid: $${opts.grossAmount.toFixed(2)}\n\nNext: You're all set on payment. We'll be in touch with prep details closer to your date.`,
    idempotencyKey: `payment-receipt/${opts.studioId}/${opts.to}/${opts.netAmount}/${nanoid(8)}`,
  });
}

/** Client: contract ready to sign */
export async function emailContractToSign(opts: {
  studioId: string;
  to: string;
  clientName?: string;
  title: string;
  token: string;
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const href = absoluteUrl(`/c/${opts.token}`);
  const who = opts.clientName || "there";
  return emailClient({
    to: opts.to,
    subject: `Please sign — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Agreement to sign",
      bodyHtml: `<p>Hi ${escapeHtml(who)},</p>
<p>Please review and sign your agreement${opts.title ? ` (${escapeHtml(offeringLabel(opts.title))})` : ""}.</p>
${nextStepHtml("Open the link, read the terms, and sign when ready. Reply to this email with questions.")}`,
      ctaLabel: "Sign now",
      ctaHref: href,
    }),
    text: `Hi ${who},\n\nPlease review and sign your agreement.\n\nNext: Open the link, read the terms, and sign when ready.\n${href}`,
    idempotencyKey: `contract-sign/${opts.token}`,
  });
}

/** Client: signed agreement copy */
export async function emailContractSignedCopy(opts: {
  studioId: string;
  to: string;
  clientName?: string;
  title: string;
  body: string;
  signerName: string;
  signedDate: string;
  token: string;
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const href = absoluteUrl(`/c/${opts.token}`);
  const who = opts.clientName || opts.signerName || "there";
  const when = formatSignedDate(opts.signedDate);
  const agreementHtml = escapeHtml(opts.body).replace(/\n/g, "<br>");
  const label = offeringLabel(opts.title) || opts.title;

  return emailClient({
    to: opts.to,
    subject: `Signed agreement — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: label,
      bodyHtml: `<p>Hi ${escapeHtml(who)},</p>
<p>Signed by ${escapeHtml(opts.signerName)} · ${when}</p>
<div style="margin-top:24px;padding:20px;border:1px solid #e8e4de;font-size:14px;line-height:1.65;color:#2a2622">${agreementHtml}</div>`,
      ctaLabel: "View signed agreement",
      ctaHref: href,
    }),
    text: `Hi ${who},\n\nSigned by ${opts.signerName} · ${when}\n\n${label}\n\n${opts.body}\n\n${href}`,
    idempotencyKey: `contract-signed/${opts.token}`,
  });
}

/** Client: questionnaire invite */
export async function emailQuestionnaireInvite(opts: {
  studioId: string;
  to: string;
  clientName: string;
  title: string;
  token: string;
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const href = absoluteUrl(`/q/${opts.token}`);
  return emailClient({
    to: opts.to,
    subject: `Questionnaire — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Questionnaire",
      bodyHtml: `<p>Hi ${escapeHtml(opts.clientName)},</p>
<p>Please complete this short questionnaire${opts.title ? ` (${escapeHtml(offeringLabel(opts.title))})` : ""} when you have a moment.</p>
${nextStepHtml("Answer the questions in the link. We'll use your answers to prepare the next step.")}`,
      ctaLabel: "Open questionnaire",
      ctaHref: href,
    }),
    text: `Hi ${opts.clientName},\n\nPlease complete this questionnaire.\n\nNext: Answer the questions in the link. We'll use your answers to prepare the next step.\n${href}`,
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
  /** Project workflow step after confirm — drives “Next” copy */
  nextWorkflowStep?: string | null;
  projectId?: string;
  sessionId?: string;
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
  const confirmed = bookingConfirmedSentence(when, opts.sessionTypeName);
  const next = nextStepAfterBookingConfirm(opts.nextWorkflowStep);
  const cancelBit = opts.cancelHref
    ? `<p style="margin-top:24px;font-size:13px;opacity:0.75"><a href="${escapeHtml(opts.cancelHref)}" style="color:inherit">Need to cancel?</a></p>`
    : "";
  return emailClient({
    to: opts.to,
    subject: `Booking confirmed — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "You're booked",
      bodyHtml: `<p>Hi ${escapeHtml(opts.clientName)},</p>
<p>${escapeHtml(confirmed)}</p>
${nextStepHtml(next)}${cancelBit}`,
    }),
    text: `Hi ${opts.clientName},\n\n${confirmed}\n\nNext: ${next}${opts.cancelHref ? `\n\nNeed to cancel? ${opts.cancelHref}` : ""}`,
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
  /** Booking request id for stable idempotency */
  requestId?: string;
  projectId?: string;
  sessionId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const declined = bookingDeclinedSentence(opts.sessionTypeName);
  const stableId = opts.requestId || opts.sessionTypeName;
  return emailClient({
    to: opts.to,
    subject: `Booking update — ${db.studio.name}`,
    fromDisplayName: db.studio.name,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.projectId,
      sessionId: opts.sessionId,
      fallbackEmail: db.studio.ownerEmail,
      displayName: db.studio.name,
    }),
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Request update",
      bodyHtml: `<p>Hi ${escapeHtml(opts.clientName)},</p>
<p>${escapeHtml(declined)}</p>
<p>${escapeHtml(opts.reason)}</p>
${nextStepHtml("No further action is needed. Reply to this email if you'd like to find another date.")}`,
    }),
    text: `Hi ${opts.clientName},\n\n${declined}\n\n${opts.reason}\n\nNext: No further action is needed. Reply if you'd like to find another date.`,
    idempotencyKey: `booking-declined/${opts.studioId}/${opts.to}/${stableId}`,
  });
}

/** Studio: inquirer canceled */
export async function emailStudioBookingCanceled(opts: {
  studioId: string;
  clientName: string;
  sessionTypeName: string;
  reason: string;
  projectHref?: string;
  /** Project id for stable idempotency */
  projectId?: string;
}) {
  const db = await readStudioDb(opts.studioId);
  const to = db.studio.ownerEmail;
  if (!to) return { ok: false as const, skipped: true };
  const line = bookingCanceledStudioSentence(
    opts.clientName,
    opts.sessionTypeName,
  );
  const stableId =
    opts.projectId ||
    `${opts.clientName.replace(/\s+/g, "-")}-${opts.sessionTypeName.replace(/\s+/g, "-")}`;
  return emailClient({
    to,
    subject: `Canceled: ${opts.clientName} — ${db.studio.name}`,
    fromDisplayName: "Aura",
    replyTo: undefined,
    html: wrapHtml({
      studioName: db.studio.name,
      title: "Request canceled",
      bodyHtml: `<p>${escapeHtml(line)}</p>
<p>Reason: ${escapeHtml(opts.reason)}</p>`,
      ...(opts.projectHref
        ? { ctaLabel: "Open project", ctaHref: absoluteUrl(opts.projectHref) }
        : {}),
    }),
    idempotencyKey: `booking-canceled-studio/${opts.studioId}/${stableId}`,
  });
}

/**
 * Deliver a public contact form message to the studio inbox (AURA-306).
 * `replyTo` is the client so Reply works in the studio’s mail client.
 */
export async function emailContactToStudio(opts: {
  studio: Studio;
  message: ContactMessage;
}): Promise<
  { ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }
> {
  const to = studioContactRecipientEmail(opts.studio);
  if (!to) {
    return { ok: false, error: "Studio contact email missing" };
  }

  const msg = opts.message;
  const source = contactSourceLabel(msg.source);
  const studioName = opts.studio.name || "Studio";
  const subject = `${source} message — ${studioName}`;

  const rows: string[] = [
    `<p><strong>From</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p>`,
  ];
  if (msg.phone) {
    rows.push(`<p><strong>Phone</strong> ${escapeHtml(msg.phone)}</p>`);
  }
  rows.push(`<p><strong>Via</strong> ${escapeHtml(source)}</p>`);
  if (msg.context) {
    rows.push(`<p><strong>Context</strong> ${escapeHtml(msg.context)}</p>`);
  }
  if (msg.projectId) {
    const projectPath = msg.sessionId
      ? `/admin/projects/${msg.projectId}/sessions/${msg.sessionId}#messages`
      : `/admin/projects/${msg.projectId}#messages`;
    const projectHref = absoluteUrl(projectPath);
    rows.push(
      `<p><strong>Project</strong> <a href="${escapeHtml(projectHref)}">Open messages</a></p>`,
    );
  }
  if (msg.sessionId) {
    rows.push(
      `<p><strong>Session</strong> ${escapeHtml(msg.sessionId)}</p>`,
    );
  }
  rows.push(
    `<p style="margin-top:20px;white-space:pre-wrap">${escapeHtml(msg.message)}</p>`,
  );

  const textLines = [
    `From: ${msg.name} <${msg.email}>`,
    msg.phone ? `Phone: ${msg.phone}` : null,
    `Via: ${source}`,
    msg.context ? `Context: ${msg.context}` : null,
    msg.projectId ? `Project: ${msg.projectId}` : null,
    msg.sessionId ? `Session: ${msg.sessionId}` : null,
    "",
    msg.message,
  ].filter((line): line is string => line != null);

  return emailClient({
    to,
    subject,
    fromDisplayName: studioName,
    replyTo: msg.email,
    html: wrapHtml({
      studioName,
      title: subject,
      bodyHtml: rows.join("\n"),
    }),
    text: textLines.join("\n"),
    idempotencyKey: `contact/${opts.studio.id}/${msg.id}`,
  });
}

/**
 * Optional client acknowledgment when contactPrefs.autoReplyEnabled (AURA-314).
 * Failures are non-fatal — studio delivery is the source of truth.
 */
export async function emailContactAutoReply(opts: {
  studio: Studio;
  message: ContactMessage;
}): Promise<
  | { ok: true; id?: string; skipped?: boolean }
  | { ok: false; error: string; skipped?: boolean }
> {
  const prefs = studioContactPrefs(opts.studio);
  if (!prefs.autoReplyEnabled) {
    return { ok: true, skipped: true };
  }

  const to = String(opts.message.email || "")
    .trim()
    .toLowerCase();
  if (!to) {
    return { ok: false, error: "Client email missing" };
  }

  const studioName = opts.studio.name || "Studio";
  const body =
    (prefs.autoReplyMessage || DEFAULT_CONTACT_AUTO_REPLY).trim() ||
    DEFAULT_CONTACT_AUTO_REPLY;
  const title = "Message received";
  const greeting = opts.message.name?.trim()
    ? `Hi ${opts.message.name.trim()},`
    : "Hi,";

  return emailClient({
    to,
    subject: `${studioName} — ${title}`,
    fromDisplayName: studioName,
    replyTo: clientTransactionalReplyTo({
      projectId: opts.message.projectId,
      sessionId: opts.message.sessionId,
      fallbackEmail: studioContactRecipientEmail(opts.studio),
      displayName: studioName,
    }),
    html: wrapHtml({
      studioName,
      title,
      bodyHtml: `<p>${escapeHtml(greeting)}</p><p style="white-space:pre-wrap">${escapeHtml(body)}</p>`,
    }),
    text: `${greeting}\n\n${body}`,
    idempotencyKey: `contact-auto-reply/${opts.studio.id}/${opts.message.id}`,
  });
}

/**
 * One-shot studio → client reply via Resend (AURA-374).
 * Reply-To = project inbound so further client replies stay routed. Not an Inbox.
 */
export async function emailProjectClientReply(opts: {
  studio: Studio;
  to: string;
  clientName?: string;
  body: string;
  projectId: string;
  sessionId?: string;
  idempotencyKey: string;
}): Promise<
  { ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }
> {
  const to = String(opts.to || "")
    .trim()
    .toLowerCase();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Client email missing" };
  }
  const body = String(opts.body || "").trim();
  if (!body) {
    return { ok: false, error: "Message required" };
  }

  const studioName = opts.studio.name || "Studio";
  const who = (opts.clientName || "").trim() || "there";
  const replyTo = clientTransactionalReplyTo({
    projectId: opts.projectId,
    sessionId: opts.sessionId,
    fallbackEmail:
      studioContactRecipientEmail(opts.studio) || opts.studio.ownerEmail,
    displayName: studioName,
  });

  return emailClient({
    to,
    subject: `Message from ${studioName}`,
    fromDisplayName: studioName,
    replyTo,
    html: wrapHtml({
      studioName,
      title: "Message",
      bodyHtml: `<p>Hi ${escapeHtml(who)},</p>
<p style="white-space:pre-wrap">${escapeHtml(body)}</p>
${nextStepHtml("Reply to this email — your message goes to the studio.")}`,
    }),
    text: `Hi ${who},\n\n${body}\n\nNext: Reply to this email — your message goes to the studio.`,
    idempotencyKey: opts.idempotencyKey,
  });
}

