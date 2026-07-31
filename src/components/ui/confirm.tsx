"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "accent" | "neutral";
};

type AlertOptions = {
  title: string;
  message: string;
  okLabel?: string;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type Pending =
  | {
      mode: "confirm";
      opts: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      mode: "alert";
      opts: AlertOptions;
      resolve: () => void;
    };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const close = useCallback((result: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (!current) return;
    if (current.mode === "confirm") current.resolve(result);
    else current.resolve();
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next: Pending = { mode: "confirm", opts, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const alert = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      const next: Pending = { mode: "alert", opts, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {pending ? (
        <Dialog
          open
          onClose={() => close(false)}
          title={pending.opts.title}
        >
          <p className="text-sm text-muted whitespace-pre-wrap">
            {pending.opts.message}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {pending.mode === "confirm" ? (
              <>
                <Button
                  type="button"
                  tone="ghost"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => close(false)}
                >
                  {pending.opts.cancelLabel || "Cancel"}
                </Button>
                <Button
                  type="button"
                  tone={pending.opts.tone || "danger"}
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => close(true)}
                >
                  {pending.opts.confirmLabel || "Confirm"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => close(true)}
              >
                {pending.opts.okLabel || "OK"}
              </Button>
            )}
          </div>
        </Dialog>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
