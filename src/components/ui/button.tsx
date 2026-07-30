import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Tone = "accent" | "neutral" | "danger" | "ghost" | "onMedia";
type Size = "sm" | "md" | "lg";

const toneClass: Record<Tone, string> = {
  accent: "bg-accent text-accent-ink hover:opacity-90",
  neutral: "bg-ink text-surface hover:opacity-90",
  danger: "bg-danger text-danger-ink hover:opacity-90",
  ghost: "bg-transparent text-ink hover:bg-line/40",
  onMedia:
    "border border-on-media/90 bg-transparent text-on-media hover:bg-on-media hover:text-ink",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
  /** Shows busy state so the control feels responsive while work runs. */
  pending?: boolean;
  pendingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      tone = "accent",
      size = "md",
      type = "button",
      pending = false,
      pendingLabel,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className={cn(
          "inline-flex touch-target items-center justify-center gap-2 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
          toneClass[tone],
          sizeClass[size],
          pending && "opacity-70",
          className,
        )}
        {...props}
      >
        {pending ? pendingLabel || "Working…" : children}
      </button>
    );
  },
);
