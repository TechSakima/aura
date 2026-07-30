import { requireAdmin } from "@/lib/auth";
import type { Contract, Gallery, Proposal } from "@/lib/types";

export type PublicAccessResult =
  | { ok: true; preview: boolean }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Public gallery token access (AURA-006).
 * - `live`: public read + download
 * - `expired`: public read; download blocked
 * - `draft` / `archived`: 404 unless studio admin session (preview).
 *   Admin may download on **draft** preview; archived stays read-only.
 */
export async function assertPublicGalleryAccess(
  gallery: Pick<Gallery, "status" | "studioId">,
  opts?: { mutate?: boolean },
): Promise<PublicAccessResult> {
  const status = gallery.status;
  if (status === "live") return { ok: true, preview: false };
  if (status === "expired" && !opts?.mutate) {
    return { ok: true, preview: false };
  }
  if (status === "expired" && opts?.mutate) {
    return { ok: false, status: 403, error: "Gallery unavailable" };
  }

  if (status === "draft" || status === "archived") {
    const admin = await requireAdmin();
    if (admin && admin.studioId === gallery.studioId) {
      if (status === "archived" && opts?.mutate) {
        return { ok: false, status: 403, error: "Gallery unavailable" };
      }
      return { ok: true, preview: true };
    }
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: false, status: 404, error: "Not found" };
}

/**
 * Public quote token access (AURA-006).
 * - View: `sent` | `accepted` | `declined`, or `draft` with admin preview
 * - Accept (mutate): only `sent` (idempotent `accepted` handled by caller)
 */
export async function assertPublicProposalAccess(
  proposal: Pick<Proposal, "status" | "studioId">,
  opts?: { accept?: boolean },
): Promise<PublicAccessResult> {
  const status = proposal.status;

  if (opts?.accept) {
    if (status === "sent" || status === "accepted") {
      return { ok: true, preview: false };
    }
    if (status === "draft") {
      return { ok: false, status: 403, error: "Quote is not available yet." };
    }
    if (status === "declined") {
      return { ok: false, status: 403, error: "Quote is no longer available." };
    }
    return { ok: false, status: 404, error: "Not found" };
  }

  if (status === "sent" || status === "accepted" || status === "declined") {
    return { ok: true, preview: false };
  }

  if (status === "draft") {
    const admin = await requireAdmin();
    if (admin && admin.studioId === proposal.studioId) {
      return { ok: true, preview: true };
    }
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: false, status: 404, error: "Not found" };
}

/**
 * Public contract token access (AURA-271 / pairs AURA-006).
 * - View: `awaiting_signature` | `completed`, or `draft` with admin preview
 * - Sign (mutate): only `awaiting_signature`
 * - `canceled` / unknown: 404
 */
export async function assertPublicContractAccess(
  contract: Pick<Contract, "status" | "studioId">,
  opts?: { sign?: boolean },
): Promise<PublicAccessResult> {
  const status = contract.status;

  if (opts?.sign) {
    if (status === "awaiting_signature") {
      return { ok: true, preview: false };
    }
    if (status === "completed") {
      return { ok: false, status: 403, error: "Already signed" };
    }
    if (status === "draft") {
      return { ok: false, status: 403, error: "Contract is not available yet." };
    }
    return { ok: false, status: 404, error: "Not found" };
  }

  if (status === "awaiting_signature" || status === "completed") {
    return { ok: true, preview: false };
  }

  if (status === "draft") {
    const admin = await requireAdmin();
    if (admin && admin.studioId === contract.studioId) {
      return { ok: true, preview: true };
    }
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: false, status: 404, error: "Not found" };
}
