import type { AnalyticsEventType } from "@/lib/types";

const EVENT_LABELS: Record<AnalyticsEventType, string> = {
  proposal_view: "Quote viewed",
  proposal_accept: "Quote accepted",
  gallery_view: "Gallery viewed",
  photo_view: "Photo viewed",
  download_single: "Single download",
  download_bulk: "Bulk download",
  subalbum_view: "Album viewed",
  favorite_toggle: "Favorite toggled",
  booking_submitted: "Booking submitted",
  contract_signed: "Contract signed",
  payment_received: "Payment received",
  payment_reversed: "Payment reversed",
};

/** Human label for analytics event keys (AURA-093). */
export function analyticsEventLabel(type: string): string {
  if (type in EVENT_LABELS) {
    return EVENT_LABELS[type as AnalyticsEventType];
  }
  // Legacy alias from older writers
  if (type === "download_all") return EVENT_LABELS.download_bulk;
  return type
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
