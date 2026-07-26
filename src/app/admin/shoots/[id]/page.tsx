"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy shoot URL → client workflow wizard */
export default function ShootRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/shoots/${id}`);
      if (!res.ok) {
        router.replace("/admin/clients");
        return;
      }
      const data = await res.json();
      const clientId = data.client?.id || data.shoot?.clientId;
      if (!clientId) {
        router.replace("/admin/clients");
        return;
      }
      router.replace(`/admin/clients/${clientId}/shoots/${id}`);
    })();
  }, [id, router]);

  return <p className="text-muted">Opening workflow…</p>;
}
