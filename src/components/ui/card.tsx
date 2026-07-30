import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

/** Interaction container only — avoid wrapping static content. Radius/shadow: tokens. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
