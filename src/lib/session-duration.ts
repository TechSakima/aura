import type { SessionDurationUnit } from "@/lib/types";

/** Convert a UI duration value into stored minutes. */
export function toDurationMinutes(
  value: number,
  unit: SessionDurationUnit = "minutes",
): number {
  const n = Number.isFinite(value) && value > 0 ? value : 1;
  if (unit === "hours") return Math.round(n * 60);
  if (unit === "days") return Math.round(n * 60 * 24);
  return Math.round(n);
}

/** Convert stored minutes back to a display value for the given unit. */
export function fromDurationMinutes(
  minutes: number,
  unit: SessionDurationUnit = "minutes",
): number {
  const m = Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
  if (unit === "hours") return Math.round((m / 60) * 100) / 100;
  if (unit === "days") return Math.round((m / (60 * 24)) * 100) / 100;
  return m;
}

export function formatSessionDuration(minutes: number): string {
  const m = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  if (m >= 60 * 24 && m % (60 * 24) === 0) {
    const days = m / (60 * 24);
    return `${days}d`;
  }
  if (m >= 60 && m % 60 === 0) {
    return `${m / 60}h`;
  }
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  }
  return `${m}m`;
}
