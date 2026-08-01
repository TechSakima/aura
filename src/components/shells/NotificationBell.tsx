"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
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
  if (href.includes("/admin/projects") && href.includes("new=1")) {
    return "New project";
  }
  if (href.includes("/admin/projects/") && href.includes("#messages")) {
    return "Open project";
  }
  if (href.includes("/admin/projects/")) return "Open project";
  if (href.includes("/admin/bookings")) return "Open Bookings";
  if (href.includes("/admin/settings")) return "Open settings";
  return "View";
}

export function NotificationBell() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);

  const close = useCallback(() => setOpen(false), []);

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

  async function markAll() {
    if (unread <= 0) return;
    const prevItems = items;
    const prevUnread = unread;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error("mark-all failed");
    } catch {
      setItems(prevItems);
      setUnread(prevUnread);
    }
  }

  async function markRead(id: string) {
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("mark-read failed");
    } catch {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
      );
      setUnread((u) => u + 1);
    }
  }

  const unreadLabel =
    unread > 0
      ? `Notifications, ${unread} unread`
      : "Notifications";

  return (
    <div className="relative">
      <IconButton
        className="relative"
        aria-label={unreadLabel}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
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

      <Sheet
        open={open}
        onClose={close}
        title="Notifications"
        id={panelId}
      >
        {unread > 0 ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-muted">{unread} unread</p>
            <Button
              type="button"
              tone="ghost"
              size="sm"
              className="min-h-11 shrink-0"
              onClick={() => void markAll()}
            >
              Mark all read
            </Button>
          </div>
        ) : null}
        <ul className="-mx-5">
          {items.length === 0 ? (
            <li className="px-5 py-4">
              <EmptyState variant="inline" title="No notifications yet." />
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
                      <p className="mt-0.5 break-words text-muted">{n.body}</p>
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
                        "block border-b border-line px-5 py-3 text-sm no-underline last:border-b-0",
                        n.read
                          ? "bg-canvas"
                          : "border-l-2 border-l-accent bg-surface-elevated",
                      )}
                      onClick={() => {
                        close();
                        if (!n.read) void markRead(n.id);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "w-full border-b border-line px-5 py-3 text-left text-sm last:border-b-0",
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
      </Sheet>
    </div>
  );
}
