import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Label / value / optional hint — dashboard counts + analytics metrics. */
export function MetricTile({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-tight text-ink sm:text-4xl">
        {value}
      </p>
      {hint != null && hint !== false ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
