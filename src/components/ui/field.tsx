import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Field({
  children,
  className,
  hint,
  error,
}: {
  children: ReactNode;
  className?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {children}
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
