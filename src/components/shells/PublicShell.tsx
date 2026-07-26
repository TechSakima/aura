import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PublicShell({
  children,
  footer,
  bare,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Skip default main padding — for custom full-bleed layouts. */
  bare?: boolean;
}) {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <main
        className={cn(
          bare
            ? ""
            : "shell-pad mx-auto w-full max-w-[var(--shell-max)] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] animate-enter sm:py-14",
        )}
      >
        {children}
      </main>
      {footer ? (
        <footer className="border-t border-line">
          <div className="shell-pad mx-auto max-w-[var(--shell-max)] py-8 text-sm text-muted">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
