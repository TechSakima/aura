"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShootsIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/projects");
  }, [router]);
  return <p className="text-muted">Redirecting to projects…</p>;
}
