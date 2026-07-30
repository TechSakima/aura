import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSessionById } from "@/lib/db/store";

/** Legacy shoot URL → project session workflow (AURA-063). */
export default async function ShootRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const session = await getSessionById(id);
  const projectId = session?.projectId || session?.clientId;
  if (!session || session.studioId !== admin.studioId || !projectId) {
    redirect("/admin/projects");
  }
  redirect(`/admin/projects/${projectId}/sessions/${id}`);
}
