"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy gallery URL → Delivery step in project workflow */
export default function GalleryRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/galleries/${id}`);
      if (!res.ok) {
        router.replace("/admin/projects");
        return;
      }
      const data = await res.json();
      const sessionId =
        data.shoot?.id || data.gallery?.sessionId || data.gallery?.shootId;
      const projectId =
        data.client?.id ||
        data.shoot?.projectId ||
        data.shoot?.clientId ||
        data.gallery?.projectId;
      if (!sessionId || !projectId) {
        router.replace("/admin/projects");
        return;
      }
      router.replace(
        `/admin/projects/${projectId}/sessions/${sessionId}?step=delivery`,
      );
    })();
  }, [id, router]);

  return <p className="text-muted">Opening delivery step…</p>;
}
