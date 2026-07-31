"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pwaSwSurfaceForPath } from "@/lib/pwa-sw-scope";

function askSkipWaiting(worker: ServiceWorker | null | undefined) {
  worker?.postMessage({ type: "SKIP_WAITING" });
}

/** Reload once when a new SW takes control after an update (AURA-393). */
let controllerReloadWired = false;

function armUpdateReload() {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/**
 * First install: wait for control, then arm for future updates (no reload).
 * Already controlled: arm immediately so the next controllerchange reloads.
 */
function wireControllerReload() {
  if (controllerReloadWired) return;
  controllerReloadWired = true;
  if (navigator.serviceWorker.controller) {
    armUpdateReload();
    return;
  }
  const onFirstControl = () => {
    navigator.serviceWorker.removeEventListener(
      "controllerchange",
      onFirstControl,
    );
    armUpdateReload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", onFirstControl);
}

function wireUpdate(reg: ServiceWorkerRegistration) {
  void reg.update();
  if (reg.waiting) askSkipWaiting(reg.waiting);
  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (
        installing.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        askSkipWaiting(installing);
      }
    });
  });
}

/** Unregister legacy origin-wide `/` SW so surfaces stay isolated (AURA-368). */
async function dropLegacyRootRegistration() {
  const regs = await navigator.serviceWorker.getRegistrations();
  const rootScope = `${window.location.origin}/`;
  await Promise.all(
    regs
      .filter((reg) => reg.scope === rootScope)
      .map((reg) => reg.unregister()),
  );
}

export function RegisterSW() {
  const pathname = usePathname() || "/";

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

    const surface = pwaSwSurfaceForPath(pathname);

    void (async () => {
      try {
        await dropLegacyRootRegistration();

        if (!surface.scope) {
          return;
        }

        wireControllerReload();
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: surface.scope,
          updateViaCache: "none",
        });
        wireUpdate(reg);
      } catch {
        /* ignore */
      }
    })();
  }, [pathname]);

  return null;
}
