import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-[var(--density-section-y,2rem)] flex flex-col gap-[var(--density-stack-gap,0.75rem)] border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-display tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="max-w-xl text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-col gap-[var(--density-control-gap,0.5rem)] sm:w-auto sm:flex-row sm:flex-wrap">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
