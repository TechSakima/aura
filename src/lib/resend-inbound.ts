import { Resend } from "resend";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import { getStudioDoc } from "@/lib/db/store";
import {
  stripContactHtml,
  stripContactMessage,
} from "@/lib/public-contact-server";
import type { Studio } from "@/lib/types";

export function resendInboundClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function resendInboundDomain(): string {
  return String(process.env.RESEND_INBOUND_DOMAIN || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

/** Parse bare emails from To/Cc header values. */
export function parseEmailAddresses(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? [value]
      : [];
  const out: string[] = [];
  for (const item of raw) {
    const matches = item.matchAll(
      /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*/gi,
    );
    for (const m of matches) {
      const addr = m[0]?.toLowerCase();
      if (addr) out.push(addr);
    }
  }
  return [...new Set(out)];
}

export function extractFromAddress(from: unknown): {
  email: string;
  name: string;
} {
  const raw = Array.isArray(from) ? String(from[0] || "") : String(from || "");
  const angle = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (angle) {
    const email = angle[2]!.trim().toLowerCase();
    const name = stripContactHtml(angle[1] || "").slice(0, 120);
    return { email, name: name || email.split("@")[0] || "Client" };
  }
  const email = raw.trim().toLowerCase();
  return {
    email,
    name: email.includes("@") ? email.split("@")[0]! : "Client",
  };
}

/**
 * Resolve studio from inbound To local-part:
 * - homepage slug (`jane@inbound…`)
 * - `s-{studioId}` stable address
 */
export async function resolveStudioFromInboundRecipients(
  recipients: string[],
): Promise<Studio | null> {
  const domain = resendInboundDomain();
  if (!domain) return null;

  for (const addr of recipients) {
    const at = addr.lastIndexOf("@");
    if (at < 1) continue;
    const local = addr.slice(0, at);
    const host = addr.slice(at + 1);
    if (host !== domain) continue;

    if (local.startsWith("s-") && local.length > 2) {
      const studioId = local.slice(2);
      const studio = await getStudioDoc(studioId);
      if (studio) return studio;
      continue;
    }

    const bySlug = await findStudioByHomepageSlug(local);
    if (bySlug) return bySlug;
  }
  return null;
}

/** Plain-text body only — never trust HTML (AURA-315). */
export function sanitizeInboundBody(opts: {
  text?: string | null;
  html?: string | null;
  subject?: string | null;
}): { message: string; context: string } {
  const text = stripContactMessage(String(opts.text || "")).slice(0, 4000);
  const fromHtml = opts.html
    ? stripContactMessage(String(opts.html)).slice(0, 4000)
    : "";
  const message =
    text ||
    fromHtml ||
    "(No message body)";
  const context = stripContactHtml(String(opts.subject || "Inbound email")).slice(
    0,
    200,
  );
  return {
    message,
    context: context || "Inbound email",
  };
}

export function inboundContactMessageId(emailId: string): string {
  const safe = String(emailId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
  return `inbound_${safe || "unknown"}`;
}
