"use client";

import { useEffect } from "react";
import {
  kitModulesForPreset,
  type KitFontModule,
} from "@/lib/fonts/kits";
import type { FontPresetId } from "@/lib/types";

async function loadKitClass(mod: KitFontModule): Promise<string> {
  switch (mod) {
    case "newsreader":
      return (await import("@/lib/fonts/newsreader")).newsreader.variable;
    case "dm-sans":
      return (await import("@/lib/fonts/dm-sans")).dmSans.variable;
    case "syne":
      return (await import("@/lib/fonts/syne")).syne.variable;
    case "cormorant":
      return (await import("@/lib/fonts/cormorant")).cormorant.variable;
  }
}

/**
 * Loads kit `next/font` CSS variable classes onto `<html>` for the active pairing.
 * Root layout only ships Fraunces + Figtree (AURA-398).
 */
export function EnsureKitFonts({
  preset,
}: {
  preset?: FontPresetId | string | null;
}) {
  useEffect(() => {
    const modules = kitModulesForPreset(preset);
    if (!modules.length) return;

    let cancelled = false;
    const applied: string[] = [];

    void (async () => {
      const classes = await Promise.all(modules.map(loadKitClass));
      if (cancelled) return;
      for (const cls of classes) {
        if (!cls || document.documentElement.classList.contains(cls)) continue;
        document.documentElement.classList.add(cls);
        applied.push(cls);
      }
    })();

    return () => {
      cancelled = true;
      for (const cls of applied) {
        document.documentElement.classList.remove(cls);
      }
    };
  }, [preset]);

  return null;
}
