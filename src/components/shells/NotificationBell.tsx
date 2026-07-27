"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Note = {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
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

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    void load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-line/50 hover:text-ink"
        aria-label="Notifications"
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
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 border border-line bg-canvas shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={() => void markAll()}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted">No notifications yet.</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-line px-3 py-3 text-sm ${n.read ? "opacity-70" : ""}`}
                >
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="block no-underline text-ink"
                      onClick={() => setOpen(false)}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-muted">{n.body}</p>
                      <p className="mt-2 text-xs font-medium text-accent">
                        {n.href.includes("/admin/projects/")
                          ? "Open project inquiry →"
                          : n.href.includes("/admin/bookings")
                            ? "Open Bookings →"
                            : "View →"}
                      </p>
                    </Link>
                  ) : (
                    <>
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-muted">{n.body}</p>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
