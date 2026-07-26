import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {description ? <p className="max-w-md text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
