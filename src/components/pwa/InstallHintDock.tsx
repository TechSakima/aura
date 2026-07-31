"use client";

import { useCallback, useEffect } from "react";
import { InstallHint } from "@/components/pwa/InstallHint";

const CLEARANCE_VAR = "--install-hint-clearance";

/**
 * Fixed InstallHint + html clearance for content / sticky CTAs (AURA-451).
 * Never uses gallery thumb-bar phantom offset.
 */
export function InstallHintDock({ storageKey }: { storageKey: string }) {
  const setClearance = useCallback((present: boolean) => {
    document.documentElement.style.setProperty(
      CLEARANCE_VAR,
      present ? "calc(1rem + var(--install-hint-bar))" : "0px",
    );
  }, []);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty(CLEARANCE_VAR, "0px");
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 z-30 shell-pad bottom-[calc(1rem+var(--safe-inset-bottom))]">
      <div className="mx-auto max-w-md">
        <InstallHint
          storageKey={storageKey}
          onPresenceChange={setClearance}
        />
      </div>
    </div>
  );
}
