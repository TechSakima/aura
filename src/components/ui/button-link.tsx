import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const toneClass = {
  accent: "bg-accent text-accent-ink hover:opacity-90",
  neutral: "bg-ink text-surface hover:opacity-90",
  danger: "bg-danger text-danger-ink hover:opacity-90",
  ghost: "bg-transparent text-ink hover:bg-line/40",
  onMedia:
    "border border-on-media/90 bg-transparent text-on-media hover:bg-on-media hover:text-ink",
} as const;

const sizeClass = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
} as const;

/** Link styled as Button (AURA-203). Use for navigation that looks like an action. */
export function ButtonLink({
  href,
  tone = "accent",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  tone?: keyof typeof toneClass;
  size?: keyof typeof sizeClass;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex touch-target items-center justify-center gap-2 rounded-md font-medium no-underline transition-opacity",
        toneClass[tone],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
