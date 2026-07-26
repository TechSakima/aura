"use client";

import { Button, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

const linkClass = {
  sm: "inline-flex min-h-9 items-center rounded-md border border-line bg-ink px-3 text-sm text-surface no-underline hover:opacity-90",
  md: "inline-flex min-h-11 items-center rounded-md border border-line bg-ink px-4 text-sm text-surface no-underline hover:opacity-90",
} as const;

export function ShootPublicLinks({
  quoteToken,
  galleryToken,
  size = "sm",
  className,
  showCopy = false,
}: {
  quoteToken?: string | null;
  galleryToken?: string | null;
  size?: "sm" | "md";
  className?: string;
  showCopy?: boolean;
}) {
  const { push } = useToast();
  const quoteHref = quoteToken ? `/p/${quoteToken}` : null;
  const galleryHref = galleryToken ? `/g/${galleryToken}` : null;

  if (!quoteHref && !galleryHref) return null;

  async function copy(href: string, label: string) {
    try {
      await navigator.clipboard.writeText(absoluteUrl(href));
      push(`${label} link copied`, "success");
    } catch {
      push("Could not copy link", "danger");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {quoteHref ? (
        <>
          <a
            href={quoteHref}
            target="_blank"
            rel="noreferrer"
            className={linkClass[size]}
          >
            View quote
          </a>
          {showCopy ? (
            <Button
              type="button"
              size={size}
              tone="ghost"
              onClick={() => void copy(quoteHref, "Quote")}
            >
              Copy quote
            </Button>
          ) : null}
        </>
      ) : null}
      {galleryHref ? (
        <>
          <a
            href={galleryHref}
            target="_blank"
            rel="noreferrer"
            className={linkClass[size]}
          >
            View gallery
          </a>
          {showCopy ? (
            <Button
              type="button"
              size={size}
              tone="ghost"
              onClick={() => void copy(galleryHref, "Gallery")}
            >
              Copy gallery
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
