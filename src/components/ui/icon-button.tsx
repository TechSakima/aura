import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonTone = "default" | "onAccent";

export function IconButton({
  className,
  type = "button",
  label,
  active,
  tone = "default",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  /** Icon + text label (≥44px). Omit for icon-only. */
  label?: string;
  active?: boolean;
  /** Branded chrome on accent fills (AURA-245). */
  tone?: IconButtonTone;
}) {
  const labeledTone =
    tone === "onAccent"
      ? active
        ? "bg-accent-ink/15 text-accent-ink"
        : "text-accent-ink/80 hover:bg-accent-ink/10 hover:text-accent-ink"
      : active
        ? "bg-line/40 text-ink"
        : "text-ink/65 hover:bg-line/40 hover:text-ink";

  if (label) {
    return (
      <button
        type={type}
        disabled={disabled}
        aria-label={props["aria-label"] || label}
        aria-pressed={active || undefined}
        className={cn(
          "inline-flex h-11 min-h-11 touch-target items-center gap-2 rounded-md px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors disabled:opacity-50",
          labeledTone,
          className,
        )}
        {...props}
      >
        <span className="inline-flex shrink-0" aria-hidden>
          {children}
        </span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex size-11 touch-target items-center justify-center rounded-md text-ink transition-colors hover:bg-line/40 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
