import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { AdminShell } from "@/components/shells/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { resolveStudioThemePreset } from "@/lib/themes";

export async function generateMetadata(): Promise<Metadata> {
  const admin = await requireAdmin();
  const name = admin?.studio.name?.trim() || "Aura";
  const short = name.slice(0, 12);
  return {
    title: `${name} — Studio`,
    appleWebApp: {
      capable: true,
      title: short,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const admin = await requireAdmin();
  if (!admin) {
    return { themeColor: "#1a1a1a" };
  }
  const preset = resolveStudioThemePreset(admin.studio.theme);
  return { themeColor: preset.accent };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-aura-pathname") || "";
  if (pathname.startsWith("/admin/login")) {
    return children;
  }

  const admin = await requireAdmin();
  const name = admin?.studio.name || "Aura";
  const logoUrl = admin?.studio.logoUrl;
  return (
    <AdminShell studioName={name} logoUrl={logoUrl}>
      {children}
    </AdminShell>
  );
}
