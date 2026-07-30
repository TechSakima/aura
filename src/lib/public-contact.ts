/** Client + shared shapes for public studio contact (AURA-304 / 305). */

export type PublicContactSource =
  | "homepage"
  | "gallery"
  | "booking"
  | "other";

export type PublicContactPayload = {
  name: string;
  email: string;
  message: string;
  phone?: string;
  /** Honeypot — must be empty */
  company?: string;
  /** Form mount time (ms) — time-trap (AURA-312) */
  startedAt?: number;
  context?: string;
  source: PublicContactSource;
  /** Homepage resolve */
  slug?: string;
  /** Gallery resolve */
  galleryToken?: string;
  /** Quote soft-failure resolve (AURA-309) */
  proposalToken?: string;
  /** Pay soft-failure resolve (AURA-309) */
  paymentLinkId?: string;
  /** Cancel soft-failure resolve (AURA-382) */
  cancelToken?: string;
};

export class PublicContactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicContactError";
  }
}

/** POST /api/public/contact — implemented in AURA-305. */
export async function submitPublicContact(
  payload: PublicContactPayload,
): Promise<void> {
  const res = await fetch("/api/public/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new PublicContactError(
      String(data.error || "Couldn't send — try again"),
    );
  }
}
