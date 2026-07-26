import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export function IconButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 touch-target items-center justify-center rounded-md text-ink transition-colors hover:bg-line/40 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
