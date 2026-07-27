import { headers } from "next/headers";
import { AdminShell } from "@/components/shells/AdminShell";
import { requireAdmin } from "@/lib/auth";

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
