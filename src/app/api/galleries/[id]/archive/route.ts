import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { COL } from "@/lib/db/collections";
import {
  deleteStudioDocs,
  patchStudioDoc,
  readStudioDb,
  updateStudioDoc,
} from "@/lib/db/store";
import { downloadFilename } from "@/lib/images/download-filename";
import { derivativePathsToDelete } from "@/lib/images/storage-paths";
import { deleteStorageObject, getSignedMediaDownloadUrl } from "@/lib/storage/upload";
import type { Project, ProjectSession } from "@/lib/types";
import { deleteFavoritesForGalleries } from "@/lib/gallery-favorites";

const ARCHIVE_TTL_SEC = 60 * 30;

/** Admin archive: signed URLs for client zip; server deletes photos + marks archived. No App Hosting buffer (AURA-366). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const gallery = db.galleries.find((g) => g.id === id);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sessionId = gallery.sessionId || gallery.shootId;
  const session = sessionId
    ? db.sessions.find((s) => s.id === sessionId)
    : null;
  const project = session
    ? db.projects.find((c) => c.id === session.projectId)
    : null;
  const proposal = session?.proposalId
    ? db.proposals.find((p) => p.id === session.proposalId)
    : null;
  const photos = db.photos.filter((p) => p.galleryId === id);

  const items: { url: string; filename: string }[] = [];
  const failed: string[] = [];
  for (const photo of photos) {
    if (!photo.storagePath?.startsWith("studios/")) continue;
    try {
      const ext = photo.kind === "video" ? "mp4" : "jpg";
      const filename = downloadFilename(
        photo.originalFilename,
        `${photo.kind}-${photo.id}`,
        ext,
      );
      const url = await getSignedMediaDownloadUrl(photo.storagePath, {
        expiresInSec: ARCHIVE_TTL_SEC,
        filename,
      });
      items.push({ url, filename });
    } catch {
      failed.push(photo.id);
    }
  }

  const details = [
    `Gallery: ${gallery.title}`,
    `Client: ${project?.name || "—"}`,
    `Email: ${project?.email || "—"}`,
    `Phone: ${project?.phone || "—"}`,
    `Session label: ${session?.type || "—"}`,
    `Shoot date: ${session?.startsAt || "—"}`,
    `Status: ${session?.status || "—"}`,
    "",
    "Intake answers:",
    JSON.stringify(session?.intakeAnswers || proposal?.intakeAnswers || {}, null, 2),
    "",
    `Archived at: ${new Date().toISOString()}`,
  ].join("\n");

  for (const photo of photos) {
    if (!photo.storagePath.startsWith("studios/")) continue;
    await Promise.all([
      deleteStorageObject(photo.storagePath).catch(() => undefined),
      ...derivativePathsToDelete(photo.storagePath).map((p) =>
        deleteStorageObject(p).catch(() => undefined),
      ),
    ]);
  }

  await deleteStudioDocs(
    COL.photos,
    photos.map((p) => p.id),
  );
  await deleteFavoritesForGalleries([id]);
  await patchStudioDoc(COL.galleries, id, {
    status: "archived",
    coverPhotoUrl: null,
    updatedAt: new Date().toISOString(),
  });
  const linkedId = gallery.sessionId || gallery.shootId;
  if (linkedId) {
    await updateStudioDoc<ProjectSession>(COL.projectSessions, linkedId, (s) => {
      s.status = "archived";
      s.updatedAt = new Date().toISOString();
      return s;
    });
  }
  if (project && project.studioId === admin.studioId) {
    await updateStudioDoc<Project>(COL.projects, project.id, (p) => {
      if (p.stage !== "canceled" && p.stage !== "archived") {
        p.stage = "completed";
      }
      p.updatedAt = new Date().toISOString();
      return p;
    });
  }

  return NextResponse.json({
    urls: items,
    detailsText: details,
    expiresInSec: ARCHIVE_TTL_SEC,
    failed: failed.length ? failed : undefined,
    galleryTitle: gallery.title,
  });
}
