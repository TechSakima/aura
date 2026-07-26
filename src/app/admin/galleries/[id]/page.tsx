"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy gallery URL → Delivery step in client workflow */
export default function GalleryRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/galleries/${id}`);
      if (!res.ok) {
        router.replace("/admin/clients");
        return;
      }
      const data = await res.json();
      const shootId = data.shoot?.id || data.gallery?.shootId;
      const clientId = data.client?.id || data.shoot?.clientId;
      if (!shootId || !clientId) {
        router.replace("/admin/clients");
        return;
      }
      router.replace(
        `/admin/clients/${clientId}/shoots/${shootId}?step=delivery`,
      );
    })();
  }, [id, router]);

  return <p className="text-muted">Opening delivery step…</p>;
}
