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
        "size-5 rounded border-line accent-accent",
        className,
      )}
      {...props}
    />
  );
}
