"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AdminSurfacePreview } from "@/components/admin/AdminSurfacePreview";
import { EmptyState } from "@/components/ui";

function AdminPreviewInner() {
  const params = useParams<{ kind: string; id: string }>();
  const searchParams = useSearchParams();
  const kind = typeof params.kind === "string" ? params.kind : "";
  const id = typeof params.id === "string" ? decodeURIComponent(params.id) : "";
  const from = searchParams.get("from");

  return <AdminSurfacePreview kind={kind} id={id} from={from} />;
}

/** Public surfaces under `/admin` scope for installed studio PWA (AURA-445). */
export default function AdminPreviewPage() {
  return (
    <Suspense
      fallback={<EmptyState variant="loading" title="Loading preview…" />}
    >
      <AdminPreviewInner />
    </Suspense>
  );
}
