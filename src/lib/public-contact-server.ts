import { studioContactRecipientEmail, studioContactPrefs } from "@/lib/contact-prefs";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import { listStudiosWithPaymentLink } from "@/lib/db/payments";
import {
  findGalleryByPublicToken,
  findProposalByToken,
  findStudioIdByProjectCancelToken,
  getStudioDoc,
} from "@/lib/db/store";
import {
  enabledHomepageModules,
  ensureHomepageModules,
} from "@/lib/homepage-modules";
import type { PublicContactSource } from "@/lib/public-contact";
import type { ContactMessage, Gallery, Studio } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Max JSON body for POST /api/public/contact (AURA-312). */
export const PUBLIC_CONTACT_MAX_BODY_BYTES = 24_576;

/** Reject instant bot submits; allow slow humans (AURA-312). */
export const PUBLIC_CONTACT_MIN_ELAPSED_MS = 2_000;
export const PUBLIC_CONTACT_MAX_ELAPSED_MS = 6 * 60 * 60 * 1_000;

function stripControlChars(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/** Plain-text sanitize for short fields — tags + control chars, collapse space. */
export function stripContactHtml(value: string): string {
  return stripControlChars(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Message body — keep newlines, never HTML (AURA-312). */
export function stripContactMessage(value: string): string {
  return stripControlChars(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Read + size-cap JSON body before parse (AURA-312). */
export async function readPublicContactJson(
  req: Request,
): Promise<
  | { ok: true; body: unknown }
  | { ok: false; status: number; error: string }
> {
  const cl = req.headers.get("content-length");
  if (cl != null && cl !== "") {
    const n = Number(cl);
    if (Number.isFinite(n) && n > PUBLIC_CONTACT_MAX_BODY_BYTES) {
      return { ok: false, status: 413, error: "Message too large" };
    }
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength > PUBLIC_CONTACT_MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Message too large" };
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid request" };
  }
}

/**
 * Time-trap: too fast / too old / missing → treat like honeypot (silent ok).
 * Returns true when the submit should be discarded without error.
 */
export function isContactTimeTrap(startedAt: number | undefined): boolean {
  if (startedAt == null || !Number.isFinite(startedAt)) return true;
  const elapsed = Date.now() - startedAt;
  if (elapsed < PUBLIC_CONTACT_MIN_ELAPSED_MS) return true;
  if (elapsed > PUBLIC_CONTACT_MAX_ELAPSED_MS) return true;
  return false;
}

/** Matches ContactModule UI: form is primary when form or email is on (AURA-307 / AURA-316). */
export function studioHomepageContactFormEnabled(studio: Studio): boolean {
  const hp = studio.homepage;
  if (!hp) return false;
  ensureHomepageModules(hp);
  const mod = enabledHomepageModules(hp.modules).find(
    (m) => m.type === "contact",
  );
  if (mod?.type === "contact") {
    return Boolean(mod.props.showContactForm || mod.props.showEmail);
  }
  return Boolean(hp.showContactForm || hp.showEmail);
}

/** Soft-failure Message path — recipient required, form toggles not required (AURA-309). */
function studioCanReceiveContact(studio: Studio): boolean {
  return Boolean(studioContactRecipientEmail(studio));
}

export type ParsedPublicContact = {
  name: string;
  email: string;
  message: string;
  phone?: string;
  company?: string;
  startedAt?: number;
  context?: string;
  source: PublicContactSource;
  slug?: string;
  galleryToken?: string;
  proposalToken?: string;
  paymentLinkId?: string;
  cancelToken?: string;
};

export function parsePublicContactBody(
  body: unknown,
): { ok: true; data: ParsedPublicContact } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request" };
  }
  const b = body as Record<string, unknown>;
  const sourceRaw = String(b.source || "other");
  const source: PublicContactSource =
    sourceRaw === "homepage" ||
    sourceRaw === "gallery" ||
    sourceRaw === "booking" ||
    sourceRaw === "other"
      ? sourceRaw
      : "other";

  const name = stripContactHtml(String(b.name || "")).slice(0, 120);
  const email = stripContactHtml(String(b.email || ""))
    .toLowerCase()
    .slice(0, 254);
  const message = stripContactMessage(String(b.message || "")).slice(0, 4000);
  const phoneRaw = stripContactHtml(String(b.phone || "")).slice(0, 40);
  const company = String(b.company || "").trim().slice(0, 120);
  const context = stripContactHtml(String(b.context || "")).slice(0, 200);
  const slug = String(b.slug || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
  const galleryToken = String(b.galleryToken || "")
    .trim()
    .slice(0, 80);
  const proposalToken = String(b.proposalToken || "")
    .trim()
    .slice(0, 80);
  const paymentLinkId = String(b.paymentLinkId || "")
    .trim()
    .slice(0, 80);
  const cancelToken = String(b.cancelToken || "")
    .trim()
    .slice(0, 80);
  const startedRaw = b.startedAt;
  const startedAt =
    typeof startedRaw === "number"
      ? startedRaw
      : typeof startedRaw === "string" && startedRaw.trim()
        ? Number(startedRaw)
        : undefined;

  if (!name) return { ok: false, error: "Add your name" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Add a valid email" };
  if (message.length < 2) return { ok: false, error: "Add a message" };

  return {
    ok: true,
    data: {
      name,
      email,
      message,
      phone: phoneRaw || undefined,
      company: company || undefined,
      startedAt:
        startedAt != null && Number.isFinite(startedAt) ? startedAt : undefined,
      context: context || undefined,
      source,
      slug: slug || undefined,
      galleryToken: galleryToken || undefined,
      proposalToken: proposalToken || undefined,
      paymentLinkId: paymentLinkId || undefined,
      cancelToken: cancelToken || undefined,
    },
  };
}

export type ResolvedContactStudio = {
  studio: Studio;
  gallery?: Gallery;
};

/** Resolve studio from public token/slug; gate prefs per surface. */
export async function resolveContactStudio(
  data: ParsedPublicContact,
): Promise<
  | { ok: true; resolved: ResolvedContactStudio }
  | { ok: false; status: number; error: string }
> {
  if (data.galleryToken) {
    const gallery = await findGalleryByPublicToken(data.galleryToken);
    if (!gallery?.studioId) {
      return { ok: false, status: 404, error: "Not found" };
    }
    const studio = await getStudioDoc(gallery.studioId);
    if (!studio) {
      return { ok: false, status: 404, error: "Not found" };
    }
    if (!studioContactPrefs(studio).showGalleryContactForm) {
      return { ok: false, status: 403, error: "Contact is unavailable" };
    }
    return { ok: true, resolved: { studio, gallery } };
  }

  if (data.proposalToken) {
    const proposal = await findProposalByToken(data.proposalToken);
    if (!proposal?.studioId) {
      return { ok: false, status: 404, error: "Not found" };
    }
    const studio = await getStudioDoc(proposal.studioId);
    if (!studio || !studioCanReceiveContact(studio)) {
      return { ok: false, status: 403, error: "Contact is unavailable" };
    }
    return { ok: true, resolved: { studio } };
  }

  if (data.paymentLinkId) {
    const hit = await listStudiosWithPaymentLink(data.paymentLinkId);
    if (!hit?.studioId) {
      return { ok: false, status: 404, error: "Not found" };
    }
    const studio = await getStudioDoc(hit.studioId);
    if (!studio || !studioCanReceiveContact(studio)) {
      return { ok: false, status: 403, error: "Contact is unavailable" };
    }
    return { ok: true, resolved: { studio } };
  }

  if (data.cancelToken) {
    const studioId = await findStudioIdByProjectCancelToken(data.cancelToken);
    if (!studioId) {
      return { ok: false, status: 404, error: "Not found" };
    }
    const studio = await getStudioDoc(studioId);
    if (!studio || !studioCanReceiveContact(studio)) {
      return { ok: false, status: 403, error: "Contact is unavailable" };
    }
    return { ok: true, resolved: { studio } };
  }

  if (data.slug) {
    const studio = await findStudioByHomepageSlug(data.slug);
    if (!studio) {
      return { ok: false, status: 404, error: "Not found" };
    }
    if (data.source === "homepage") {
      if (!studioHomepageContactFormEnabled(studio)) {
        return { ok: false, status: 403, error: "Contact is unavailable" };
      }
    } else if (!studioCanReceiveContact(studio)) {
      // Booking / soft-failure escape — recipient only (AURA-309).
      return { ok: false, status: 403, error: "Contact is unavailable" };
    }
    return { ok: true, resolved: { studio } };
  }

  return { ok: false, status: 400, error: "Missing studio" };
}

export function buildContactMessage(
  id: string,
  studioId: string,
  data: ParsedPublicContact,
  gallery?: Gallery,
): ContactMessage {
  const now = new Date().toISOString();
  return {
    id,
    studioId,
    source: data.source,
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    context: data.context,
    slug: data.slug,
    galleryId: gallery?.id,
    galleryToken: data.galleryToken,
    proposalToken: data.proposalToken,
    paymentLinkId: data.paymentLinkId,
    cancelToken: data.cancelToken,
    emailStatus: "pending",
    createdAt: now,
  };
}

export function contactSourceLabel(
  source: PublicContactSource,
): "Homepage" | "Gallery" | "Booking" | "Contact" {
  if (source === "gallery") return "Gallery";
  if (source === "homepage") return "Homepage";
  if (source === "booking") return "Booking";
  return "Contact";
}
