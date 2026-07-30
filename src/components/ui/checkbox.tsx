import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-5 shrink-0 rounded border-line accent-accent",
        /* Invisible padding grows hit to ≥44px without shifting layout (AURA-375) */
        "box-content p-3 -m-3",
        className,
      )}
      {...props}
    />
  );
}
