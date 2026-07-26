"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Shoots list moved into Clients → workflow */
export default function ShootsIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/clients");
  }, [router]);
  return <p className="text-muted">Redirecting to clients…</p>;
}
