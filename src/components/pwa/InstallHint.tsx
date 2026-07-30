"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import { useDisplayModeStandalone } from "@/lib/use-display-mode-standalone";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  // Chrome/Firefox/Edge on iOS — no reliable install path in-app
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  return /WebKit/.test(ua);
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Sparse Add to Home Screen hint — dismissible, never blocks (AURA-293).
 * Android/Chrome: native install when `beforeinstallprompt` fires.
 * iOS Safari: one-line Share → Add to Home Screen.
 */
export function InstallHint({
  storageKey,
  className,
}: {
  storageKey: string;
  className?: string;
}) {
  const standalone = useDisplayModeStandalone();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [ios, setIos] = useState(false);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (standalone) return;
    if (readDismissed(storageKey)) {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setIos(false);
      setReady(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const timer = window.setTimeout(() => {
      if (isIosSafari()) {
        setIos(true);
        setReady(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(timer);
    };
  }, [standalone, storageKey]);

  function dismiss() {
    writeDismissed(storageKey);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    setPending(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      dismiss();
    } catch {
      /* ignore */
    } finally {
      setPending(false);
    }
  }

  if (standalone || dismissed || !ready) return null;
  if (!deferred && !ios) return null;

  return (
    <div
      role="status"
      className={cn(
        "browser-only pointer-events-auto flex items-start gap-3 rounded-md border border-line bg-surface px-3 py-3 shadow-md",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">Add to Home Screen</p>
        <p className="mt-0.5 text-sm text-muted">
          {ios
            ? "Share, then Add to Home Screen"
            : "Install for quicker access"}
        </p>
        {deferred ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              pending={pending}
              pendingLabel="…"
              onClick={() => void install()}
            >
              Install
            </Button>
            <Button type="button" tone="ghost" size="sm" onClick={dismiss}>
              Not now
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <Button type="button" tone="ghost" size="sm" onClick={dismiss}>
              Not now
            </Button>
          </div>
        )}
      </div>
      <IconButton
        type="button"
        aria-label="Dismiss"
        className="shrink-0"
        onClick={dismiss}
      >
        ×
      </IconButton>
    </div>
  );
}
