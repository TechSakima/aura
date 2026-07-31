"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContractPublicView } from "@/components/public/ContractPublicView";
import { ButtonLink, EmptyState } from "@/components/ui";
import { CONTRACT_PREVIEW_STORAGE_KEY } from "@/lib/contracts/preview-storage";

type PreviewPayload = {
  title: string;
  body: string;
  studioName?: string;
};

function ContractTemplatePreviewInner() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let studioName = "";
      const studioRes = await fetch("/api/studio");
      if (studioRes.ok) {
        const studio = await studioRes.json();
        studioName = String(studio.studio?.name || "");
      }

      if (templateId) {
        const res = await fetch("/api/documents/contracts");
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not load template");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const tmpl = (data.templates || []).find(
          (t: { id: string }) => t.id === templateId,
        );
        if (!tmpl) {
          setError("Template not found");
          setLoading(false);
          return;
        }
        setPayload({
          title: tmpl.name,
          body: tmpl.body,
          studioName,
        });
        setLoading(false);
        return;
      }

      try {
        const raw = sessionStorage.getItem(CONTRACT_PREVIEW_STORAGE_KEY);
        if (!raw) {
          setError("No preview loaded");
          setLoading(false);
          return;
        }
        const parsed = JSON.parse(raw) as PreviewPayload;
        if (cancelled) return;
        setPayload({
          title: String(parsed.title || "Photography agreement"),
          body: String(parsed.body || ""),
          studioName: studioName || parsed.studioName,
        });
      } catch {
        if (!cancelled) setError("Could not load preview");
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (loading) {
    return <EmptyState variant="loading" title="Loading preview…" />;
  }

  if (error || !payload) {
    return (
      <EmptyState
        variant="error"
        title={error || "Could not load preview"}
        action={
          <ButtonLink href="/admin/documents?tab=templates" tone="accent">
            Templates
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">
          Contract preview
        </p>
        <ButtonLink
          href="/admin/documents?tab=templates"
          tone="ghost"
          className="min-h-11 w-full sm:w-auto"
        >
          Templates
        </ButtonLink>
      </div>
      <div className="border border-line bg-canvas shell-pad py-[max(2.5rem,env(safe-area-inset-top))] sm:py-14">
        <ContractPublicView
          title={payload.title}
          body={payload.body}
          studioName={payload.studioName}
          status="draft"
          preview
        />
      </div>
    </div>
  );
}

/** Template preview using the public `/c/` renderer (AURA-133). */
export default function ContractTemplatePreviewPage() {
  return (
    <Suspense
      fallback={<EmptyState variant="loading" title="Loading preview…" />}
    >
      <ContractTemplatePreviewInner />
    </Suspense>
  );
}
