import type { Studio, StudioBookingDefaults } from "@/lib/types";

export const DEFAULT_BUFFER_MINUTES = 15;

export const DEFAULT_BOOKING_DEFAULTS: StudioBookingDefaults = {
  defaultBufferMinutes: DEFAULT_BUFFER_MINUTES,
};

export function clampBufferMinutes(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_BUFFER_MINUTES;
  return Math.min(240, Math.max(0, Math.round(n)));
}

export function normalizeBookingDefaults(
  raw?: Partial<StudioBookingDefaults> | null,
): StudioBookingDefaults {
  return {
    defaultBufferMinutes: clampBufferMinutes(
      raw?.defaultBufferMinutes ?? DEFAULT_BUFFER_MINUTES,
    ),
  };
}

export function studioBookingDefaults(studio: Studio): StudioBookingDefaults {
  return normalizeBookingDefaults(studio.bookingDefaults);
}
