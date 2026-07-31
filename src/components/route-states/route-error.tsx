"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, EmptyState } from "@/components/ui";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function RetryAction({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      tone="accent"
      pending={pending}
      pendingLabel="Retrying…"
      onClick={() => {
        startTransition(() => {
          router.refresh();
          reset();
        });
      }}
    >
      Try again
    </Button>
  );
}

function ErrorBody({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      variant="error"
      title="Couldn't load this page"
      action={<RetryAction reset={reset} />}
    />
  );
}

/** Error boundary UI inside AdminShell. */
export function AdminRouteError(props: RouteErrorProps) {
  return <ErrorBody {...props} />;
}

/** Error boundary UI for public surfaces. */
export function PublicRouteError(props: RouteErrorProps) {
  return (
    <PublicShell>
      <ErrorBody {...props} />
    </PublicShell>
  );
}
