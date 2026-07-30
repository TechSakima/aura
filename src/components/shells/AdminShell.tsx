"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { InstallHint } from "@/components/pwa/InstallHint";
import { NotificationBell } from "@/components/shells/NotificationBell";
import { Button } from "@/components/ui/button";
import { rememberAdminRoute } from "@/lib/admin-last-route";
import { cn } from "@/lib/cn";
import { resolveMediaUrl } from "@/lib/media-url";
import { useDisplayModeStandalone } from "@/lib/use-display-mode-standalone";

function RememberAdminRoute() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin/login")) return;
    const q = searchParams?.toString();
    const hash =
      typeof window !== "undefined" ? window.location.hash : "";
    rememberAdminRoute(`${pathname}${q ? `?${q}` : ""}${hash}`);
  }, [pathname, searchParams]);

  return null;
}

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  /** Optional badge key shown when count > 0 */
  badgeKey?: "pendingBookings";
};

const primaryNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", match: (p) => p === "/admin" },
  {
    href: "/admin/projects",
    label: "Projects",
    // Legacy indexes server-redirect (AURA-063). Keep shoots* for day-of helper.
    match: (p) =>
      p.startsWith("/admin/projects") || p.startsWith("/admin/shoots"),
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    match: (p) => p.startsWith("/admin/bookings"),
    badgeKey: "pendingBookings",
  },
];

/** Ops first for mobile More drawer (AURA-066). */
const moreNav: NavItem[] = [
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
    href: "/admin/galleries",
    label: "Galleries",
    match: (p) => p === "/admin/galleries",
  },
  {
    href: "/admin/prep",
    label: "Library",
    match: (p) =>
      p.startsWith("/admin/prep") ||
      p.startsWith("/admin/ideas") ||
      p.startsWith("/admin/shot-lists") ||
      p.startsWith("/admin/packages"),
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

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="ml-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-ink"
      aria-label={`${count} pending`}
    >
      {label}
    </span>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
  className,
  badgeCount = 0,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  badgeCount?: number;
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
      <span>{item.label}</span>
      <NavBadge count={badgeCount} />
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
  const router = useRouter();
  const standalone = useDisplayModeStandalone();
  const logo = resolveMediaUrl(logoUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingBookings, setPendingBookings] = useState(0);
  const moreActive = moreNav.some((item) => item.match(pathname));

  function badgeFor(item: NavItem) {
    if (item.badgeKey === "pendingBookings") return pendingBookings;
    return 0;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadBadges() {
      try {
        const res = await fetch("/api/bookings/session-types?view=badges");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setPendingBookings(Number(data.pendingCount) || 0);
      } catch {
        /* ignore poll errors */
      }
    }
    void loadBadges();
    const t = window.setInterval(() => void loadBadges(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

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
      <Suspense fallback={null}>
        <RememberAdminRoute />
      </Suspense>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
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
                    <NavLink
                      item={item}
                      pathname={pathname}
                      badgeCount={badgeFor(item)}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            {standalone ? (
              <Button
                type="button"
                tone="ghost"
                className="hidden min-h-11 md:inline-flex"
                onClick={() => void signOut()}
              >
                Log out
              </Button>
            ) : null}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-ink md:hidden"
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
          <div className="max-h-[min(70dvh,calc(100dvh-8rem))] overflow-y-auto border-t border-line bg-canvas pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:hidden">
            <nav aria-label="More" className="shell-pad py-3">
              <p className="px-3 pb-2 text-xs uppercase tracking-[0.14em] text-muted">
                More
              </p>
              <ul className="flex flex-col gap-1">
                {moreNav.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      pathname={pathname}
                      onNavigate={() => setMenuOpen(false)}
                      className="w-full"
                      badgeCount={badgeFor(item)}
                    />
                  </li>
                ))}
                {standalone ? (
                  <>
                    <li className="mt-2 border-t border-line pt-2">
                      <Link
                        href="/admin/settings/account"
                        onClick={() => setMenuOpen(false)}
                        className="inline-flex min-h-11 w-full items-center rounded-md px-3 text-sm text-muted no-underline hover:bg-line/50 hover:text-ink"
                      >
                        Account
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full items-center rounded-md px-3 text-sm text-muted hover:bg-line/50 hover:text-ink"
                        onClick={() => {
                          setMenuOpen(false);
                          void signOut();
                        }}
                      >
                        Log out
                      </button>
                    </li>
                  </>
                ) : null}
              </ul>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="shell-pad mx-auto w-full max-w-[var(--shell-max)] animate-enter pt-[var(--density-section-y,2rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-[var(--density-section-y,2.5rem)]">
        {children}
      </main>

      <div className="pointer-events-none fixed inset-x-0 z-50 shell-pad md:bottom-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[var(--shell-max)]">
          <InstallHint storageKey="aura-install-dismiss-admin" />
        </div>
      </div>

      {/* Mobile bottom tabs — safe-area clears home indicator (AURA-292) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-[var(--shell-max)] grid-cols-4 gap-0 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {primaryNav.map((item) => {
            const active = item.match(pathname);
            const count = badgeFor(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium uppercase tracking-[0.12em] no-underline",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  <span className="relative inline-flex items-center">
                    {item.label}
                    {count > 0 ? (
                      <span
                        className="absolute -right-2.5 -top-1 h-2 w-2 rounded-full bg-accent"
                        aria-label={`${count} pending`}
                      />
                    ) : null}
                  </span>
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
