import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-line bg-surface-elevated px-3 py-2 text-base text-ink placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}
