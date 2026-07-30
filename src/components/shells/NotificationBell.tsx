"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

type Note = {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

function actionLabel(href: string): string {
  if (href.includes("/admin/projects/")) return "Open project";
  if (href.includes("/admin/bookings")) return "Open Bookings";
  if (href.includes("#messages")) return "Open messages";
  return "View";
}

export function NotificationBell() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications || []);
    setUnread(data.unread || 0);
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("touchstart", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  async function markAll() {
    if (unread <= 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  async function markRead(id: string) {
    setItems((prev) => {
      const cur = prev.find((n) => n.id === id);
      if (cur && !cur.read) {
        setUnread((u) => Math.max(0, u - 1));
      }
      return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    });
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const unreadLabel =
    unread > 0
      ? `Notifications, ${unread} unread`
      : "Notifications";

  return (
    <div className="relative" ref={rootRef}>
      <IconButton
        className="relative"
        aria-label={unreadLabel}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        active={open || unread > 0}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unread > 0 ? (
          <span
            className="absolute right-0.5 top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-ink"
            aria-hidden
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </IconButton>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-line bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Notifications</p>
              {unread > 0 ? (
                <p className="text-xs text-muted">
                  {unread} unread
                </p>
              ) : null}
            </div>
            {unread > 0 ? (
              <Button
                type="button"
                tone="ghost"
                size="sm"
                className="min-h-11 shrink-0"
                onClick={() => void markAll()}
              >
                Mark all read
              </Button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => {
                const body = (
                  <>
                    <div className="flex items-start gap-2">
                      {!n.read ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                          aria-hidden
                        />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-medium",
                            n.read ? "text-muted" : "text-ink",
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-muted">{n.body}</p>
                        {n.href ? (
                          <p className="mt-2 text-xs font-medium text-accent">
                            {actionLabel(n.href)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className={cn(
                          "block border-b border-line px-3 py-3 text-sm no-underline",
                          n.read
                            ? "bg-canvas"
                            : "border-l-2 border-l-accent bg-surface-elevated",
                        )}
                        onClick={() => {
                          setOpen(false);
                          if (!n.read) void markRead(n.id);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "w-full border-b border-line px-3 py-3 text-left text-sm",
                          n.read
                            ? "bg-canvas"
                            : "border-l-2 border-l-accent bg-surface-elevated",
                        )}
                        onClick={() => {
                          if (!n.read) void markRead(n.id);
                        }}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
