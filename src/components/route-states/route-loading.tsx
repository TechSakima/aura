import { PublicShell } from "@/components/shells/PublicShell";
import { EmptyState, Skeleton } from "@/components/ui";

function LoadingBody() {
  return (
    <div className="space-y-4" aria-busy="true">
      <EmptyState variant="loading" title="Loading…" />
      <Skeleton className="h-8 w-44 max-w-full" />
      <Skeleton className="h-28 w-full max-w-xl" />
    </div>
  );
}

/** Suspense fallback inside AdminShell. */
export function AdminRouteLoading() {
  return <LoadingBody />;
}

/** Suspense fallback for public surfaces without page chrome yet. */
export function PublicRouteLoading() {
  return (
    <PublicShell>
      <LoadingBody />
    </PublicShell>
  );
}
