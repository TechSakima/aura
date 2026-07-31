"use client";

import { useId, useState } from "react";
import { Button, ButtonLink, Sheet, useToast } from "@/components/ui";
import { adminPreviewHref } from "@/lib/admin-preview-paths";
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
  /** Wizard header: compact Copy behind Sheet below `md` (AURA-446). */
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
  const [copyOpen, setCopyOpen] = useState(false);
  const copySheetId = useId();
  const quotePublic = quoteToken ? `/p/${quoteToken}` : null;
  const galleryPublic = galleryToken ? `/g/${galleryToken}` : null;
  const quotePreview = quoteToken
    ? adminPreviewHref("p", quoteToken)
    : null;
  const galleryPreview = galleryToken
    ? adminPreviewHref("g", galleryToken)
    : null;

  if (!quotePreview && !galleryPreview) return null;

  async function copy(href: string, label: string) {
    try {
      await navigator.clipboard.writeText(absoluteUrl(href));
      push(`${label} link copied`, "success");
    } catch {
      push("Could not copy link", "danger");
    }
  }

  const copyTargets = [
    quotePublic
      ? { id: "quote", label: "Copy quote", href: quotePublic, name: "Quote" }
      : null,
    galleryPublic
      ? {
          id: "gallery",
          label: "Copy gallery",
          href: galleryPublic,
          name: "Gallery",
        }
      : null,
  ].filter(Boolean) as {
    id: string;
    label: string;
    href: string;
    name: string;
  }[];

  const headerCopy = showCopy && density === "header" && copyTargets.length > 0;
  const inlineCopy = showCopy && density !== "header";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        density === "header" && "w-full sm:w-auto sm:justify-end",
        className,
      )}
    >
      {quotePreview ? (
        <ButtonLink
          href={quotePreview}
          tone="neutral"
          size={size}
          className="min-h-11"
        >
          View quote
        </ButtonLink>
      ) : null}
      {galleryPreview ? (
        <ButtonLink
          href={galleryPreview}
          tone="neutral"
          size={size}
          className="min-h-11"
        >
          View gallery
        </ButtonLink>
      ) : null}

      {inlineCopy
        ? copyTargets.map((t) => (
            <Button
              key={t.id}
              type="button"
              size={size}
              tone="ghost"
              className="min-h-11"
              onClick={() => void copy(t.href, t.name)}
            >
              {t.label}
            </Button>
          ))
        : null}

      {headerCopy ? (
        <>
          {/* Desktop header — inline Copy (AURA-446). */}
          {copyTargets.map((t) => (
            <Button
              key={t.id}
              type="button"
              size={size}
              tone="ghost"
              className="hidden min-h-11 md:inline-flex"
              onClick={() => void copy(t.href, t.name)}
            >
              {t.label}
            </Button>
          ))}
          {/* Phone header — one Copy entry → Sheet */}
          <Button
            type="button"
            size={size}
            tone="ghost"
            className="min-h-11 md:hidden"
            aria-expanded={copyOpen}
            aria-controls={copySheetId}
            aria-haspopup="dialog"
            onClick={() => setCopyOpen(true)}
          >
            Copy link
          </Button>
          <Sheet
            open={copyOpen}
            onClose={() => setCopyOpen(false)}
            title="Copy link"
            id={copySheetId}
          >
            <div className="flex flex-col gap-2">
              {copyTargets.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  tone="neutral"
                  className="min-h-11 w-full"
                  onClick={() => {
                    void copy(t.href, t.name);
                    setCopyOpen(false);
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </Sheet>
        </>
      ) : null}
    </div>
  );
}
