import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/shells/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { safeAdminNext } from "@/lib/safe-admin-next";
import {
  appleStatusBarForBackground,
  studioPwaBrand,
} from "@/lib/studio-pwa-manifest";

export async function generateMetadata(): Promise<Metadata> {
  const admin = await requireAdmin();
  const brand = studioPwaBrand(admin?.studio);
  return {
    title: `${brand.name} — Studio`,
    manifest: "/admin/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: brand.shortName,
      statusBarStyle: appleStatusBarForBackground(brand.themeColor),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const admin = await requireAdmin();
  const brand = studioPwaBrand(admin?.studio);
  return { themeColor: brand.themeColor };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get("x-aura-pathname") || "";
  if (pathname.startsWith("/admin/login")) {
    return children;
  }

  // Authoritative gate (AURA-104): Firestore session + studio. Middleware only
  // checks signed cookie shape/expiry — never render AdminShell without this.
  const admin = await requireAdmin();
  if (!admin) {
    const search = h.get("x-aura-search") || "";
    const next = safeAdminNext(`${pathname || "/admin"}${search}`);
    redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  }

  const name = admin.studio.name || "Aura";
  const logoUrl = admin.studio.logoUrl;
  return (
    <AdminShell studioName={name} logoUrl={logoUrl}>
      {children}
    </AdminShell>
  );
}
