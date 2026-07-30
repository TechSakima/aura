import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EmptyStateVariant = "centered" | "inline" | "loading" | "error";

/** Empty / loading / error — prefer over bare muted “Loading…” paragraphs. */
export function EmptyState({
  variant = "centered",
  title,
  description,
  action,
  className,
}: {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  if (variant === "loading") {
    return (
      <p className={cn("text-sm text-muted", className)} role="status">
        {title}
      </p>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("py-1", className)}>
        <p className="text-sm text-muted">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    );
  }

  if (variant === "error") {
    return (
      <div
        className={cn("flex flex-col items-start gap-3 py-6", className)}
        role="alert"
      >
        <p className="text-danger">{title}</p>
        {description ? (
          <p className="max-w-md text-sm text-muted">{description}</p>
        ) : null}
        {action}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 py-10 text-center",
        className,
      )}
    >
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {description ? (
        <p className="max-w-md text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
