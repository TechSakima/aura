"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Pin a fixed overlay root to the visual viewport (AURA-457).
 * Keeps bottom-sheet Dialog / Sheet above the iOS keyboard.
 */
export function useVisualViewportFrame(
  active: boolean,
  rootRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;

    const vv = window.visualViewport;

    const clear = () => {
      root.style.top = "";
      root.style.left = "";
      root.style.width = "";
      root.style.height = "";
    };

    const sync = () => {
      if (vv) {
        root.style.top = `${vv.offsetTop}px`;
        root.style.left = `${vv.offsetLeft}px`;
        root.style.width = `${vv.width}px`;
        root.style.height = `${vv.height}px`;
        return;
      }
      root.style.top = "0";
      root.style.left = "0";
      root.style.width = "100%";
      root.style.height = "100%";
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      clear();
    };
  }, [active, rootRef]);
}
