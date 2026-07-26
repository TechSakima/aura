import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-line bg-surface-elevated px-3 text-base text-ink placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}
