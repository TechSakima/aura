"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RedirectInner() {
  const { id, shootId } = useParams<{ id: string; shootId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const step = search.get("step");
    const q = step ? `?step=${step}` : "";
    router.replace(`/admin/projects/${id}/sessions/${shootId}${q}`);
  }, [id, shootId, router, search]);
  return <p className="text-muted">Redirecting…</p>;
}

/** Legacy client/shoot wizard → project/session */
export default function ClientShootRedirectPage() {
  return (
    <Suspense fallback={<p className="text-muted">Redirecting…</p>}>
      <RedirectInner />
    </Suspense>
  );
}
