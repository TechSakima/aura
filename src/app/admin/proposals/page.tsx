"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Quotes are created inside each shoot workflow */
export default function ProposalsIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/clients");
  }, [router]);
  return <p className="text-muted">Redirecting to clients…</p>;
}
