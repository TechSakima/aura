import type { Studio } from "@/lib/types";

/** Multi-line postal address for public contact display (AURA-233). */
export function formatAddressLines(
  studio: Pick<
    Studio,
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "region"
    | "postalCode"
    | "country"
  >,
): string[] {
  const lines: string[] = [];
  if (studio.addressLine1?.trim()) lines.push(studio.addressLine1.trim());
  if (studio.addressLine2?.trim()) lines.push(studio.addressLine2.trim());
  const locality = [studio.city, studio.region, studio.postalCode]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(", ");
  if (locality) lines.push(locality);
  if (studio.country?.trim()) lines.push(studio.country.trim());
  return lines;
}

export function formatAddressQuery(lines: string[]): string {
  return lines.join(", ");
}
