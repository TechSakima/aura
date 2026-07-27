"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy /admin/clients/[id] → /admin/projects/[id] */
export default function ClientDetailRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    if (id) router.replace(`/admin/projects/${id}`);
  }, [id, router]);
  return <p className="text-muted">Redirecting…</p>;
}
