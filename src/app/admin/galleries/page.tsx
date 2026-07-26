"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Galleries are managed inside each shoot workflow (Delivery step) */
export default function GalleriesIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/clients");
  }, [router]);
  return <p className="text-muted">Redirecting to clients…</p>;
}
