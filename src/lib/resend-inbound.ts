import { Resend } from "resend";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import {
  getProjectById,
  getSessionById,
  getStudioDoc,
} from "@/lib/db/store";
import { stripInboundSignatureNoise } from "@/lib/inbound-text";
import {
  stripContactHtml,
  stripContactMessage,
} from "@/lib/public-contact-server";
import type { Studio } from "@/lib/types";

export { stripInboundSignatureNoise } from "@/lib/inbound-text";

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

/** `p-{projectId}@RESEND_INBOUND_DOMAIN` (AURA-371). */
export function projectInboundAddress(projectId: string): string | null {
  const domain = resendInboundDomain();
  const id = String(projectId || "").trim();
  if (!domain || !id) return null;
  return `p-${id}@${domain}`;
}

/** `sess-{sessionId}@RESEND_INBOUND_DOMAIN` (AURA-371). */
export function sessionInboundAddress(sessionId: string): string | null {
  const domain = resendInboundDomain();
  const id = String(sessionId || "").trim();
  if (!domain || !id) return null;
  return `sess-${id}@${domain}`;
}

/**
 * Reply-To for client transactional mail (AURA-372).
 * Prefer `p-{projectId}@inbound…` when inbound domain + project are known;
 * else session inbound; else studio owner email.
 * Display name is the studio — From stays on the verified sending domain.
 *
 * Caveat: if the studio opens a forwarded copy and replies From their personal
 * mailbox, the next client reply can drift off the project address.
 */
export function clientTransactionalReplyTo(opts: {
  projectId?: string | null;
  sessionId?: string | null;
  fallbackEmail?: string | null;
  displayName?: string | null;
}): string | undefined {
  const projectAddr = opts.projectId
    ? projectInboundAddress(opts.projectId)
    : null;
  const sessionAddr =
    !projectAddr && opts.sessionId
      ? sessionInboundAddress(opts.sessionId)
      : null;
  const addr = projectAddr || sessionAddr;
  if (addr) {
    const safe = String(opts.displayName || "")
      .replace(/[<>]/g, "")
      .trim();
    return safe ? `${safe} <${addr}>` : addr;
  }
  const fallback = String(opts.fallbackEmail || "").trim();
  return fallback || undefined;
}

export type InboundAddressPart = {
  /** Local-part with original case (Firestore ids are case-sensitive). */
  local: string;
  host: string;
  addr: string;
};

/** Parse To/Cc values into local@host; host lowercased, local case preserved. */
export function parseInboundAddressParts(value: unknown): InboundAddressPart[] {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? [value]
      : [];
  const out: InboundAddressPart[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const matches = item.matchAll(
      /([a-z0-9.!#$%&'*+/=?^_`{|}~-]+)@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)/gi,
    );
    for (const m of matches) {
      const local = m[1] || "";
      const host = (m[2] || "").toLowerCase();
      if (!local || !host) continue;
      const addr = `${local}@${host}`;
      const key = addr.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ local, host, addr });
    }
  }
  return out;
}

/** Parse bare emails from To/Cc header values (lowercased). */
export function parseEmailAddresses(value: unknown): string[] {
  return parseInboundAddressParts(value).map((p) => p.addr.toLowerCase());
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

export type InboundRoute = {
  studio: Studio;
  projectId?: string;
  sessionId?: string;
};

/**
 * Resolve studio (+ optional project/session) from inbound To local-part:
 * - `sess-{sessionId}` → session → project + studio
 * - `p-{projectId}` → project → studio
 * - `s-{studioId}` stable studio address
 * - homepage slug (`jane@inbound…`)
 */
export async function resolveInboundRoute(
  parts: InboundAddressPart[],
): Promise<InboundRoute | null> {
  const domain = resendInboundDomain();
  if (!domain) return null;

  for (const { local, host } of parts) {
    if (host !== domain) continue;

    if (local.toLowerCase().startsWith("sess-") && local.length > 5) {
      const sessionId = local.slice(5);
      const session = await getSessionById(sessionId);
      if (!session?.studioId) continue;
      const studio = await getStudioDoc(session.studioId);
      if (!studio) continue;
      const projectId = session.projectId || session.clientId || undefined;
      return {
        studio,
        projectId: projectId || undefined,
        sessionId: session.id,
      };
    }

    if (local.toLowerCase().startsWith("p-") && local.length > 2) {
      const projectId = local.slice(2);
      const project = await getProjectById(projectId);
      if (!project?.studioId) continue;
      const studio = await getStudioDoc(project.studioId);
      if (!studio) continue;
      return { studio, projectId: project.id };
    }

    if (local.toLowerCase().startsWith("s-") && local.length > 2) {
      const studioId = local.slice(2);
      const studio = await getStudioDoc(studioId);
      if (studio) return { studio };
      continue;
    }

    const bySlug = await findStudioByHomepageSlug(local.toLowerCase());
    if (bySlug) return { studio: bySlug };
  }
  return null;
}

/** @deprecated Prefer resolveInboundRoute — studio-only helper kept for callers. */
export async function resolveStudioFromInboundRecipients(
  recipients: string[],
): Promise<Studio | null> {
  const parts = parseInboundAddressParts(recipients);
  const route = await resolveInboundRoute(parts);
  return route?.studio ?? null;
}

/** Plain-text body only — never trust HTML (AURA-315). */
export function sanitizeInboundBody(opts: {
  text?: string | null;
  html?: string | null;
  subject?: string | null;
}): { message: string; context: string } {
  const text = stripInboundSignatureNoise(
    stripContactMessage(String(opts.text || "")),
  ).slice(0, 4000);
  const fromHtml = opts.html
    ? stripInboundSignatureNoise(
        stripContactMessage(String(opts.html)),
      ).slice(0, 4000)
    : "";
  const message = text || fromHtml || "(No message body)";
  const context = stripContactHtml(
    String(opts.subject || "Inbound email"),
  ).slice(0, 200);
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

/** Admin deep-link for inbound / contact notify (AURA-371 / AURA-373). */
export function inboundNotifyHref(route: {
  projectId?: string;
  sessionId?: string;
}): string {
  if (route.projectId) {
    if (route.sessionId) {
      return `/admin/projects/${route.projectId}/sessions/${route.sessionId}#messages`;
    }
    return `/admin/projects/${route.projectId}#messages`;
  }
  return "/admin#messages";
}
