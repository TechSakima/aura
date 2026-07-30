"use client";

import { useEffect } from "react";
import { useDisplayModeStandalone } from "@/lib/use-display-mode-standalone";

/**
 * Marks `<html data-standalone>` for CSS / gating browser-only UI (AURA-292).
 * Pair with `.browser-only` (hidden when installed).
 */
export function StandaloneChrome() {
  const standalone = useDisplayModeStandalone();

  useEffect(() => {
    const root = document.documentElement;
    if (standalone) {
      root.dataset.standalone = "true";
    } else {
      delete root.dataset.standalone;
    }
  }, [standalone]);

  return null;
}
