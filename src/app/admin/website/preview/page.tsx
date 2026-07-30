"use client";

import { useEffect, useState } from "react";
import { StudioHomepageView } from "@/components/public/StudioHomepageView";
import {
  Button,
  ButtonLink,
  EmptyState,
  useToast,
} from "@/components/ui";
import type { HomepagePayload } from "@/lib/homepage-payload";

/** Full-page draft preview — production renderer, not the public /h URL (AURA-226). */
export default function WebsiteDraftPreviewPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<HomepagePayload | null>(null);
  const [published, setPublished] = useState(false);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio/homepage/preview");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load preview", "danger");
        return;
      }
      const data = await res.json();
      setPublished(Boolean(data.meta?.enabled));
      setSlug(String(data.meta?.slug || ""));
      setPayload({
        studio: data.studio,
        galleries: data.galleries || [],
        modules: data.modules || [],
        featuredGallery: data.featuredGallery ?? null,
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  if (loading) {
    return <EmptyState variant="loading" title="Loading preview…" />;
  }

  if (!payload) {
    return (
      <EmptyState
        variant="error"
        title="Could not load preview"
        action={
          <ButtonLink href="/admin/website" tone="accent">
            Site builder
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            Draft preview
          </p>
          <p className="mt-1 text-sm text-muted">
            {published && slug
              ? `Same renderer as live /h/${slug}`
              : "Not on the public site until you publish"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ButtonLink
            href="/admin/website"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Site builder
          </ButtonLink>
          {published && slug ? (
            <Button
              type="button"
              tone="neutral"
              className="w-full sm:w-auto"
              onClick={() =>
                window.open(`/h/${slug}`, "_blank", "noopener")
              }
            >
              View live site
            </Button>
          ) : null}
        </div>
      </div>
      <StudioHomepageView data={payload} preview />
    </div>
  );
}
