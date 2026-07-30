import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getGalleryById, getSessionById } from "@/lib/db/store";
import { sessionDeliveryHref } from "@/lib/admin-deep-links";

/** Legacy gallery URL → Delivery step (AURA-063). */
export default async function GalleryRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const gallery = await getGalleryById(id);
  if (!gallery || gallery.studioId !== admin.studioId) {
    redirect("/admin/projects");
  }

  const sessionId = gallery.sessionId || gallery.shootId;
  let projectId: string | undefined = gallery.projectId;
  if (!projectId && sessionId) {
    const session = await getSessionById(sessionId);
    projectId = session?.projectId || session?.clientId;
  }
  if (!sessionId || !projectId) {
    redirect("/admin/projects");
  }
  redirect(sessionDeliveryHref(projectId, sessionId));
}
