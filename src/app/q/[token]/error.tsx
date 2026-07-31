"use client";

import { PublicRouteError } from "@/components/route-states/route-error";

export default function QuestionnaireError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PublicRouteError error={error} reset={reset} />;
}
