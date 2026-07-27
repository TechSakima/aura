"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /admin/clients → /admin/projects */
export default function ClientsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/projects");
  }, [router]);
  return <p className="text-muted">Redirecting…</p>;
}
