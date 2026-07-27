"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy shoot URL → project session workflow */
export default function ShootRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/shoots/${id}`);
      if (!res.ok) {
        router.replace("/admin/projects");
        return;
      }
      const data = await res.json();
      const projectId =
        data.client?.id || data.shoot?.projectId || data.shoot?.clientId;
      if (!projectId) {
        router.replace("/admin/projects");
        return;
      }
      router.replace(`/admin/projects/${projectId}/sessions/${id}`);
    })();
  }, [id, router]);

  return <p className="text-muted">Opening workflow…</p>;
}
