"use client";

import { differenceInCalendarDays } from "date-fns";

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const days = Math.max(
    0,
    differenceInCalendarDays(new Date(expiresAt), new Date()),
  );

  return (
    <p className="rounded-md border border-line bg-surface px-4 py-3 text-center text-sm">
      <span className="font-display text-2xl text-ink">{days}</span>{" "}
      <span className="text-muted">
        {days === 1 ? "Day Remaining to Download" : "Days Remaining to Download"}
      </span>
    </p>
  );
}
