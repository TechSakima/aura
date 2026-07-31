"use client";

import { useEffect } from "react";

type ChromeBottomKind = "admin" | "gallery";

/**
 * Sets an `html` class so root-level Toast inherits bottom chrome clearance
 * (ToastProvider sits outside AdminShell / PublicShell — AURA-422).
 */
export function ChromeBottom({ kind }: { kind: ChromeBottomKind }) {
  useEffect(() => {
    const root = document.documentElement;
    const cls =
      kind === "admin" ? "chrome-bottom-admin" : "chrome-bottom-gallery";
    root.classList.add(cls);
    return () => {
      root.classList.remove(cls);
    };
  }, [kind]);
  return null;
}
