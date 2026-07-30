import type { PrintPartner } from "@/lib/types";

/** Partners safe to show publicly (name + http(s) URL). */
export function publicPrintPartners(
  partners: PrintPartner[] | null | undefined,
): PrintPartner[] {
  if (!partners?.length) return [];
  return partners.filter((p) => {
    const name = p.name?.trim();
    const url = p.url?.trim();
    if (!name || !url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  });
}
