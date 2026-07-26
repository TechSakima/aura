"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Never run the SW in development — it caches Next/HMR assets and
    // causes endless reload / ChunkLoadError loops on pages like /admin/login.
    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((reg) => reg.unregister())),
      );
      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(keys.map((key) => caches.delete(key))),
        );
      }
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
