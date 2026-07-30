"use client";

import { Button, ButtonLink, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function ShootPublicLinks({
  quoteToken,
  galleryToken,
  size = "sm",
  className,
  showCopy = false,
  /** Wizard header: stack + hide Copy below `md` to avoid button soup. */
  density = "default",
}: {
  quoteToken?: string | null;
  galleryToken?: string | null;
  size?: "sm" | "md";
  className?: string;
  showCopy?: boolean;
  density?: "default" | "header";
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

  const copyClass =
    density === "header" ? "hidden min-h-11 md:inline-flex" : "min-h-11";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        density === "header" && "w-full sm:w-auto sm:justify-end",
        className,
      )}
    >
      {quoteHref ? (
        <>
          <ButtonLink
            href={quoteHref}
            target="_blank"
            rel="noreferrer"
            tone="neutral"
            size={size}
            className="min-h-11"
          >
            View quote
          </ButtonLink>
          {showCopy ? (
            <Button
              type="button"
              size={size}
              tone="ghost"
              className={copyClass}
              onClick={() => void copy(quoteHref, "Quote")}
            >
              Copy quote
            </Button>
          ) : null}
        </>
      ) : null}
      {galleryHref ? (
        <>
          <ButtonLink
            href={galleryHref}
            target="_blank"
            rel="noreferrer"
            tone="neutral"
            size={size}
            className="min-h-11"
          >
            View gallery
          </ButtonLink>
          {showCopy ? (
            <Button
              type="button"
              size={size}
              tone="ghost"
              className={copyClass}
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
