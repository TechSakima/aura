"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { resolveMediaUrl } from "@/lib/media-url";
import type { ReactNode } from "react";

const nav = [
  { href: "/admin", label: "Dashboard", match: (p: string) => p === "/admin" },
  {
    href: "/admin/clients",
    label: "Clients",
    match: (p: string) =>
      p.startsWith("/admin/clients") ||
      p.startsWith("/admin/shoots") ||
      p.startsWith("/admin/galleries") ||
      p.startsWith("/admin/proposals"),
  },
  {
    href: "/admin/prep",
    label: "Prep",
    match: (p: string) =>
      p.startsWith("/admin/prep") ||
      p.startsWith("/admin/ideas") ||
      p.startsWith("/admin/shot-lists") ||
      p.startsWith("/admin/packages"),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    match: (p: string) => p.startsWith("/admin/analytics"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    match: (p: string) => p.startsWith("/admin/settings"),
  },
];

export function AdminShell({
  children,
  studioName = "Aura",
  logoUrl,
}: {
  children: ReactNode;
  studioName?: string;
  logoUrl?: string;
}) {
  const pathname = usePathname();
  const logo = resolveMediaUrl(logoUrl);
  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="shell-pad mx-auto flex max-w-[var(--shell-max)] items-center justify-between gap-4 py-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-3 no-underline"
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-9 w-auto max-w-[11rem] object-contain"
              />
            ) : null}
            <span className="font-display text-xl tracking-tight text-ink sm:text-2xl">
              {studioName}
            </span>
          </Link>
          <nav className="overflow-x-auto">
            <ul className="flex min-w-max items-center gap-1">
              {nav.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex min-h-10 items-center rounded-md px-3 text-sm no-underline transition-colors",
                        active
                          ? "bg-ink text-surface"
                          : "text-muted hover:bg-line/50 hover:text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main className="shell-pad mx-auto w-full max-w-[var(--shell-max)] py-10 animate-enter sm:py-12">
        {children}
      </main>
    </div>
  );
}
