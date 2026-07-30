"use client";

import type { CSSProperties, ReactNode } from "react";
import { GalleryContactForm } from "@/components/gallery/GalleryContactForm";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, ButtonLink, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { resolveGalleryBrandCssVars } from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { mailtoHref, telHref } from "@/lib/social";
import type {
  GalleryDesign,
  GalleryStatus,
  StudioTheme,
} from "@/lib/types";

export type GalleryGuestReason =
  | Extract<GalleryStatus, "draft" | "expired" | "archived">
  | "not_found"
  | "load_failed"
  | "timeout";

const COPY: Record<
  GalleryGuestReason,
  { title: string; description: string }
> = {
  expired: {
    title: "Gallery expired",
    description: "This gallery is no longer available to view.",
  },
  archived: {
    title: "Gallery unavailable",
    description: "This gallery is no longer available.",
  },
  draft: {
    title: "Not available yet",
    description: "This gallery isn’t live. Check back later.",
  },
  not_found: {
    title: "Gallery not found",
    description: "This link may be wrong or the gallery was removed.",
  },
  load_failed: {
    title: "Could not load",
    description: "Something went wrong loading this gallery.",
  },
  timeout: {
    title: "Taking too long",
    description: "The gallery didn’t load in time.",
  },
};

export type GalleryGuestStudio = {
  name: string;
  logoUrl?: string;
  ownerEmail?: string;
  phone?: string;
  theme?: StudioTheme;
  showGalleryContactForm?: boolean;
};

export function galleryGuestCopy(reason: GalleryGuestReason) {
  return COPY[reason];
}

function secondaryContactLinks(studio?: GalleryGuestStudio | null): ReactNode {
  if (!studio) return null;
  const email = studio.ownerEmail?.trim();
  const phone = studio.phone?.trim();
  if (!email && !phone) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {email ? (
        <a
          href={mailtoHref(email)}
          className="inline-flex min-h-11 items-center px-3 text-sm text-muted no-underline hover:text-ink"
        >
          Email
        </a>
      ) : null}
      {email && phone ? (
        <span className="text-line" aria-hidden>
          ·
        </span>
      ) : null}
      {phone ? (
        <a
          href={telHref(phone)}
          className="inline-flex min-h-11 items-center px-3 text-sm text-muted no-underline hover:text-ink"
        >
          Call
        </a>
      ) : null}
    </div>
  );
}

function studioMailtoActions(studio?: GalleryGuestStudio | null): ReactNode[] {
  if (!studio) return [];
  const actions: ReactNode[] = [];
  if (studio.ownerEmail) {
    actions.push(
      <ButtonLink
        key="email"
        href={mailtoHref(studio.ownerEmail)}
        className="min-h-11 w-full"
      >
        Email {studio.name}
      </ButtonLink>,
    );
  }
  if (studio.phone) {
    actions.push(
      <ButtonLink
        key="phone"
        href={telHref(studio.phone)}
        tone="neutral"
        className="min-h-11 w-full"
      >
        Call
      </ButtonLink>,
    );
  }
  return actions;
}

/** Branded guest dead-end: expired / draft / archived / load errors (AURA-250). */
export function GalleryGuestState({
  reason,
  studio,
  galleryTitle,
  design,
  galleryToken,
  onRetry,
  className,
}: {
  reason: GalleryGuestReason;
  studio?: GalleryGuestStudio | null;
  galleryTitle?: string;
  design?: GalleryDesign | null;
  /** Token for in-app contact form (AURA-308). */
  galleryToken?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const offlineLoad =
    (reason === "load_failed" || reason === "timeout") &&
    typeof navigator !== "undefined" &&
    !navigator.onLine;
  const copy = offlineLoad
    ? {
        title: "You’re offline",
        description: "Reconnect, then try again.",
      }
    : COPY[reason];
  const normalized = normalizeGalleryDesign(design);
  const themeStyle = resolveGalleryBrandCssVars(
    normalized,
    studio?.theme,
  ) as CSSProperties;

  const showForm = Boolean(
    studio?.showGalleryContactForm && galleryToken && studio?.name,
  );
  const mailtoActions = showForm ? [] : studioMailtoActions(studio);
  const showBrand = Boolean(studio?.name);

  return (
    <PublicShell
      bare
      style={themeStyle}
      className={className}
      galleryMotion={normalized.motion}
      galleryDensity={normalized.density}
    >
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-4 py-16 text-center pt-[max(4rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {studio?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={studio.logoUrl}
            alt=""
            className="mb-6 h-12 w-auto max-w-[10rem] object-contain"
          />
        ) : null}
        {showBrand ? (
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            {studio!.name}
          </p>
        ) : null}
        {galleryTitle ? (
          <p className="mt-2 font-display text-xl uppercase tracking-[0.12em] text-ink">
            {galleryTitle}
          </p>
        ) : null}
        <h1 className="mt-6 font-display text-3xl text-ink">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted">{copy.description}</p>

        {showForm ? (
          <div className="mt-8 w-full text-left">
            <GalleryContactForm
              token={galleryToken!}
              studioName={studio!.name}
              galleryTitle={galleryTitle}
            />
            <div className="mt-4">{secondaryContactLinks(studio)}</div>
          </div>
        ) : null}

        {mailtoActions.length || onRetry ? (
          <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
            {mailtoActions}
            {onRetry ? (
              <Button
                tone={mailtoActions.length || showForm ? "ghost" : "accent"}
                className="min-h-11 w-full"
                onClick={onRetry}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PublicShell>
  );
}

/** Compact inline unavailable block inside a live themed shell (expired hub). */
export function GalleryUnavailableInline({
  reason,
  studio,
  galleryToken,
  galleryTitle,
  className,
}: {
  reason: Extract<GalleryStatus, "draft" | "expired" | "archived">;
  studio?: GalleryGuestStudio | null;
  galleryToken?: string;
  galleryTitle?: string;
  className?: string;
}) {
  const copy = COPY[reason];
  const showForm = Boolean(
    studio?.showGalleryContactForm && galleryToken && studio?.name,
  );
  const mailtoActions = showForm ? [] : studioMailtoActions(studio);

  return (
    <div className={cn("mx-auto max-w-md py-16 text-center", className)}>
      <EmptyState
        title={copy.title}
        description={copy.description}
        action={
          showForm ? (
            <div className="w-full max-w-md text-left sm:mx-auto">
              <GalleryContactForm
                token={galleryToken!}
                studioName={studio!.name}
                galleryTitle={galleryTitle}
              />
              <div className="mt-4 text-center">
                {secondaryContactLinks(studio)}
              </div>
            </div>
          ) : mailtoActions.length ? (
            <div className="flex w-full max-w-xs flex-col gap-2 sm:mx-auto">
              {mailtoActions}
            </div>
          ) : studio?.name ? (
            <p className="text-sm text-muted">Reach out to {studio.name}.</p>
          ) : undefined
        }
        className="items-center"
      />
    </div>
  );
}
