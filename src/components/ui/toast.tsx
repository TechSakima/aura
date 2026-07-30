"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: string; message: string; tone?: "neutral" | "success" | "danger" };

const ToastContext = createContext<{
  push: (message: string, tone?: Toast["tone"]) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(message: string, tone: Toast["tone"] = "neutral") {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed z-60 flex flex-col gap-2 bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] max-md:bottom-[calc(var(--admin-tab-bar,4.75rem)+env(safe-area-inset-bottom))]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "animate-enter rounded-md px-4 py-3 text-sm shadow-md",
              toast.tone === "success" && "bg-success text-success-ink",
              toast.tone === "danger" && "bg-danger text-danger-ink",
              toast.tone === "neutral" && "bg-ink text-surface",
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
