"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { NotificationBell } from "@/components/shells/NotificationBell";
import { cn } from "@/lib/cn";
import { resolveMediaUrl } from "@/lib/media-url";

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
};

const primaryNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", match: (p) => p === "/admin" },
  {
    href: "/admin/projects",
    label: "Projects",
    match: (p) =>
      p.startsWith("/admin/projects") ||
      p.startsWith("/admin/clients") ||
      p.startsWith("/admin/shoots") ||
      p.startsWith("/admin/galleries") ||
      p.startsWith("/admin/proposals"),
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    match: (p) => p.startsWith("/admin/bookings"),
  },
];

const moreNav: NavItem[] = [
  {
    href: "/admin/prep",
    label: "Prep",
    match: (p) =>
      p.startsWith("/admin/prep") ||
      p.startsWith("/admin/ideas") ||
      p.startsWith("/admin/shot-lists") ||
      p.startsWith("/admin/packages"),
  },
  {
    href: "/admin/payments",
    label: "Payments",
    match: (p) => p.startsWith("/admin/payments"),
  },
  {
    href: "/admin/documents",
    label: "Documents",
    match: (p) =>
      p.startsWith("/admin/documents") || p.startsWith("/admin/templates"),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    match: (p) => p.startsWith("/admin/analytics"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    match: (p) => p.startsWith("/admin/settings"),
  },
];

const allNav = [...primaryNav, ...moreNav];

function NavLink({
  item,
  pathname,
  onNavigate,
  className,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 text-sm no-underline transition-colors",
        active
          ? "bg-ink text-surface"
          : "text-muted hover:bg-line/50 hover:text-ink",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const moreActive = moreNav.some((item) => item.match(pathname));

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="shell-pad mx-auto flex max-w-[var(--shell-max)] items-center justify-between gap-3 py-3 md:py-4">
          <Link
            href="/admin"
            className="inline-flex min-w-0 items-center gap-2 no-underline sm:gap-3"
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-8 w-auto max-w-[8rem] object-contain sm:h-9 sm:max-w-[11rem]"
              />
            ) : null}
            <span className="truncate font-display text-lg tracking-tight text-ink sm:text-2xl">
              {studioName}
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />

            {/* Desktop nav */}
            <nav className="hidden md:block" aria-label="Admin">
              <ul className="flex flex-wrap items-center gap-1">
                {allNav.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-line bg-canvas md:hidden">
            <nav aria-label="Admin menu" className="shell-pad py-3">
              <ul className="flex flex-col gap-1">
                {allNav.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      pathname={pathname}
                      onNavigate={() => setMenuOpen(false)}
                      className="w-full"
                    />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="shell-pad mx-auto w-full max-w-[var(--shell-max)] py-8 pb-24 animate-enter sm:py-10 md:pb-12">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-[var(--shell-max)] grid-cols-4 gap-0 px-1 pb-[env(safe-area-inset-bottom)]">
          {primaryNav.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium uppercase tracking-[0.12em] no-underline",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium uppercase tracking-[0.12em]",
                moreActive || menuOpen ? "text-ink" : "text-muted",
              )}
            >
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
