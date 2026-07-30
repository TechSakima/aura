import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-md border border-line bg-surface-elevated px-3 text-base text-ink placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
});
