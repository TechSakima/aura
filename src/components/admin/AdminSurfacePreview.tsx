"use client";

import { ButtonLink, EmptyState } from "@/components/ui";
import {
  adminPreviewBackHref,
  adminPreviewMeta,
  adminPreviewPublicPath,
  isAdminPreviewKind,
  type AdminPreviewKind,
} from "@/lib/admin-preview-paths";

/**
 * In-shell public surface preview — top URL stays under `/admin` for installed PWA (AURA-445).
 */
export function AdminSurfacePreview({
  kind,
  id,
  from,
}: {
  kind: string;
  id: string;
  from?: string | null;
}) {
  if (!isAdminPreviewKind(kind) || !id.trim()) {
    return (
      <EmptyState
        variant="error"
        title="Preview not found"
        action={
          <ButtonLink href="/admin" tone="accent">
            Dashboard
          </ButtonLink>
        }
      />
    );
  }

  const k = kind as AdminPreviewKind;
  const meta = adminPreviewMeta(k);
  const src = adminPreviewPublicPath(k, id);
  const backHref = adminPreviewBackHref(k, from);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            {meta.label} preview
          </p>
          <p className="mt-1 truncate text-sm text-muted">{src}</p>
        </div>
        <ButtonLink
          href={backHref}
          tone="ghost"
          className="min-h-11 w-full sm:w-auto"
        >
          Back
        </ButtonLink>
      </div>
      <iframe
        title={`${meta.label} preview`}
        src={src}
        className="min-h-[min(70dvh,40rem)] w-full flex-1 rounded-md border border-line bg-canvas md:min-h-[min(75dvh,48rem)]"
      />
    </div>
  );
}
