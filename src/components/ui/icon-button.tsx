import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonTone = "default" | "onAccent";

export function IconButton({
  className,
  type = "button",
  label,
  labelFrom = "always",
  active,
  tone = "default",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  /** Icon + text label (≥44px). Omit for icon-only. */
  label?: string;
  /**
   * When `sm+`, show the text label from `sm` up; icon-only below
   * (Admin Jump — AURA-443).
   */
  labelFrom?: "always" | "sm+";
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
    const collapseLabel = labelFrom === "sm+";
    return (
      <button
        type={type}
        disabled={disabled}
        aria-label={props["aria-label"] || label}
        aria-pressed={active || undefined}
        className={cn(
          "inline-flex h-11 min-h-11 touch-target items-center gap-2 rounded-md px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors disabled:opacity-50",
          collapseLabel &&
            "max-sm:size-11 max-sm:justify-center max-sm:gap-0 max-sm:px-0",
          labeledTone,
          className,
        )}
        {...props}
      >
        <span className="inline-flex shrink-0" aria-hidden>
          {children}
        </span>
        <span
          title={label}
          className={cn(
            "max-w-[4.5rem] truncate sm:max-w-[7rem] md:max-w-none",
            collapseLabel && "hidden sm:inline",
          )}
        >
          {label}
        </span>
      </button>
    );
  }

  const iconOnlyTone =
    tone === "onAccent"
      ? active
        ? "bg-accent-ink/15 text-accent-ink"
        : "text-accent-ink/80 hover:bg-accent-ink/10 hover:text-accent-ink"
      : active
        ? "bg-line/40 text-ink"
        : "text-ink hover:bg-line/40";

  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex size-11 touch-target items-center justify-center rounded-md transition-colors disabled:opacity-50",
        iconOnlyTone,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
