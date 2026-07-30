/** Curated IANA zones for studio settings (AURA-090 / AURA-328). */

export type TimeZoneOption = {
  id: string;
  label: string;
  region: string;
};

export const COMMON_TIME_ZONES: TimeZoneOption[] = [
  { id: "Pacific/Honolulu", label: "Hawaii (Honolulu)", region: "Americas" },
  { id: "America/Anchorage", label: "Alaska (Anchorage)", region: "Americas" },
  { id: "America/Los_Angeles", label: "Pacific (Los Angeles)", region: "Americas" },
  { id: "America/Phoenix", label: "Arizona (Phoenix)", region: "Americas" },
  { id: "America/Denver", label: "Mountain (Denver)", region: "Americas" },
  { id: "America/Chicago", label: "Central (Chicago)", region: "Americas" },
  { id: "America/New_York", label: "Eastern (New York)", region: "Americas" },
  { id: "America/Toronto", label: "Eastern (Toronto)", region: "Americas" },
  { id: "America/Mexico_City", label: "Central (Mexico City)", region: "Americas" },
  { id: "America/Sao_Paulo", label: "Brasilia (São Paulo)", region: "Americas" },
  { id: "Europe/London", label: "London", region: "Europe / Africa" },
  { id: "Europe/Paris", label: "Paris / Berlin (CET)", region: "Europe / Africa" },
  { id: "Europe/Berlin", label: "Berlin", region: "Europe / Africa" },
  { id: "Europe/Madrid", label: "Madrid", region: "Europe / Africa" },
  { id: "Europe/Rome", label: "Rome", region: "Europe / Africa" },
  { id: "Europe/Amsterdam", label: "Amsterdam", region: "Europe / Africa" },
  { id: "Europe/Stockholm", label: "Stockholm", region: "Europe / Africa" },
  { id: "Europe/Athens", label: "Athens / Eastern Europe", region: "Europe / Africa" },
  { id: "Africa/Johannesburg", label: "Johannesburg", region: "Europe / Africa" },
  { id: "Asia/Dubai", label: "Dubai", region: "Asia / Pacific" },
  { id: "Asia/Kolkata", label: "India (Kolkata)", region: "Asia / Pacific" },
  { id: "Asia/Bangkok", label: "Bangkok", region: "Asia / Pacific" },
  { id: "Asia/Singapore", label: "Singapore", region: "Asia / Pacific" },
  { id: "Asia/Hong_Kong", label: "Hong Kong", region: "Asia / Pacific" },
  { id: "Asia/Tokyo", label: "Tokyo", region: "Asia / Pacific" },
  { id: "Asia/Seoul", label: "Seoul", region: "Asia / Pacific" },
  { id: "Australia/Perth", label: "Perth", region: "Asia / Pacific" },
  { id: "Australia/Sydney", label: "Sydney", region: "Asia / Pacific" },
  { id: "Pacific/Auckland", label: "Auckland", region: "Asia / Pacific" },
  { id: "UTC", label: "UTC", region: "Other" },
];

export function isValidIanaTimeZone(value: string): boolean {
  const tz = value.trim();
  if (!tz) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Options for a Select, including a legacy studio value if missing from the common list. */
export function timeZoneSelectOptions(current?: string | null): TimeZoneOption[] {
  const list = [...COMMON_TIME_ZONES];
  const id = (current || "").trim();
  if (id && isValidIanaTimeZone(id) && !list.some((z) => z.id === id)) {
    list.unshift({
      id,
      label: id.replace(/_/g, " "),
      region: "Current",
    });
  }
  return list;
}

export function timeZoneRegions(options: TimeZoneOption[]): string[] {
  const seen = new Set<string>();
  const regions: string[] = [];
  for (const opt of options) {
    if (!seen.has(opt.region)) {
      seen.add(opt.region);
      regions.push(opt.region);
    }
  }
  return regions;
}
