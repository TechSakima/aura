"use client";

import { useCallback, useEffect } from "react";
import { InstallHint } from "@/components/pwa/InstallHint";
import { cn } from "@/lib/cn";

const CLEARANCE_VAR = "--install-hint-clearance";

/**
 * Fixed InstallHint + html clearance for content / sticky CTAs (AURA-451).
 * Default dock is `1rem + safe-area` — never a phantom gallery offset on
 * surfaces without thumbs. Pass `aboveChrome` when real bottom chrome is
 * active (admin tabs / gallery thumbs via `--chrome-bottom`).
 */
export function InstallHintDock({
  storageKey,
  aboveChrome = false,
}: {
  storageKey: string;
  /** Sit above `--chrome-bottom` (admin tab bar / gallery thumb bar). */
  aboveChrome?: boolean;
}) {
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
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[var(--z-nav)] shell-pad",
        aboveChrome
          ? "bottom-[calc(var(--chrome-bottom,0px)+1rem+var(--safe-inset-bottom))]"
          : "bottom-[calc(1rem+var(--safe-inset-bottom))]",
      )}
    >
      <div className="mx-auto max-w-md">
        <InstallHint
          storageKey={storageKey}
          onPresenceChange={setClearance}
        />
      </div>
    </div>
  );
}
