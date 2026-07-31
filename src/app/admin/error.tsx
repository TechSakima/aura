"use client";

import { AdminRouteError } from "@/components/route-states/route-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AdminRouteError error={error} reset={reset} />;
}
