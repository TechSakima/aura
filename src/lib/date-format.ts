import type { DateFormat } from "@/lib/types";
import { isValidIanaTimeZone } from "@/lib/timezones";

export const DATE_FORMATS: {
  id: DateFormat;
  label: string;
}[] = [
  { id: "mm/dd/yyyy", label: "mm/dd/yyyy" },
  { id: "dd/mm/yyyy", label: "dd/mm/yyyy" },
  { id: "yyyy-mm-dd", label: "yyyy-mm-dd" },
];

export function isDateFormat(value: string): value is DateFormat {
  return DATE_FORMATS.some((f) => f.id === value);
}

function datePartsInTimeZone(
  date: Date,
  timeZone: string,
): { year: string; month: string; day: string } {
  const tz = isValidIanaTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

/** Format a date with curated studio dateFormat in an IANA time zone (AURA-329). */
export function formatStudioDate(
  date: Date,
  format: DateFormat | string,
  timeZone: string,
): string {
  const { year, month, day } = datePartsInTimeZone(date, timeZone);
  const id = isDateFormat(format) ? format : "mm/dd/yyyy";
  if (id === "dd/mm/yyyy") return `${day}/${month}/${year}`;
  if (id === "yyyy-mm-dd") return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}
