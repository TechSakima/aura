import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Editorial section heading used across public + admin surfaces. */
export function SectionIntro({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("space-y-2", align === "center" && "mx-auto max-w-2xl")}>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted md:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
