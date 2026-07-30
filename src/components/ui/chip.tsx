import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChipTone = "neutral" | "accent" | "success" | "danger" | "ink";

const tones: Record<ChipTone, string> = {
  neutral: "bg-line/60 text-ink",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  ink: "bg-ink text-surface",
};

/** Compact chip — calendar events, filters (AURA-219). Shares Badge tone language. */
export function Chip({
  children,
  tone = "accent",
  href,
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  href?: string;
  className?: string;
}) {
  const classes = cn(
    "inline-flex max-w-full truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]",
    tones[tone],
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(classes, "block no-underline hover:opacity-90")}
      >
        {children}
      </Link>
    );
  }

  return <span className={classes}>{children}</span>;
}
