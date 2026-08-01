import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

/**
 * Native checkbox with ≥44×44 hit target (AURA-375 / AURA-461).
 * Layout width matches the visual box so flex `gap-*` is not stolen by
 * negative margins (AURA-375 `p-3 -m-3` overlapped labels).
 */
export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="inline-flex size-11 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        className={cn(
          "size-5 shrink-0 rounded border border-line accent-accent",
          className,
        )}
        {...props}
      />
    </span>
  );
}
