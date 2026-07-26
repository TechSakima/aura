import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-md border border-line bg-surface-elevated px-3 text-base text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
