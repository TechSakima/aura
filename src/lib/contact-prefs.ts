import type { Studio, StudioContactPrefs } from "@/lib/types";

export const DEFAULT_CONTACT_AUTO_REPLY =
  "Thanks. We received your message and will reply soon.";

export const DEFAULT_CONTACT_PREFS: StudioContactPrefs = {
  showGalleryContactForm: false,
  autoReplyEnabled: false,
  autoReplyMessage: DEFAULT_CONTACT_AUTO_REPLY,
};

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeContactPrefs(
  raw?: Partial<StudioContactPrefs> | null,
): StudioContactPrefs {
  const recipient = String(raw?.recipientEmail ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  const message = String(
    raw?.autoReplyMessage ?? DEFAULT_CONTACT_AUTO_REPLY,
  )
    .trim()
    .slice(0, 500);
  return {
    ...(recipient && looksLikeEmail(recipient)
      ? { recipientEmail: recipient }
      : {}),
    showGalleryContactForm: Boolean(raw?.showGalleryContactForm),
    autoReplyEnabled: Boolean(raw?.autoReplyEnabled),
    autoReplyMessage: message || DEFAULT_CONTACT_AUTO_REPLY,
  };
}

export function studioContactPrefs(studio: Studio): StudioContactPrefs {
  return normalizeContactPrefs(studio.contactPrefs);
}

/** Address that should receive public contact messages (W11 send path). */
export function studioContactRecipientEmail(studio: Studio): string {
  const prefs = studioContactPrefs(studio);
  if (prefs.recipientEmail) return prefs.recipientEmail;
  return String(studio.ownerEmail || "")
    .trim()
    .toLowerCase();
}
