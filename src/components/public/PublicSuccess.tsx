import type { ReactNode } from "react";

/** Sparse public success block — shared layout for pay/book/questionnaire. */
export function PublicSuccess({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Confirmed</p>
      <h1 className="mt-3 font-display text-3xl">{title}</h1>
      <div className="mt-3 space-y-1 text-muted">{children}</div>
    </div>
  );
}
