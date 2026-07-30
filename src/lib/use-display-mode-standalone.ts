"use client";

import { useEffect, useState } from "react";

/** Installed PWA / iOS home-screen (AURA-292). */
export function getDisplayModeStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return mq || ios;
}

export function useDisplayModeStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const apply = () => {
      const ios = Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      );
      setStandalone(mq.matches || ios);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return standalone;
}
