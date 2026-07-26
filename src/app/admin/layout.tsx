import { headers } from "next/headers";
import { AdminShell } from "@/components/shells/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db/store";

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
  let name = "Aura";
  let logoUrl: string | undefined;
  if (admin) {
    const db = await readDb();
    name = db.studio.name;
    logoUrl = db.studio.logoUrl;
  }
  return (
    <AdminShell studioName={name} logoUrl={logoUrl}>
      {children}
    </AdminShell>
  );
}
