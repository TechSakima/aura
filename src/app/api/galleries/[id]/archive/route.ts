import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { deleteStorageObject, downloadStorageBuffer } from "@/lib/storage/upload";

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

  const zip = new JSZip();
  const details = [
    `Gallery: ${gallery.title}`,
    `Client: ${project?.name || "—"}`,
    `Email: ${project?.email || "—"}`,
    `Phone: ${project?.phone || "—"}`,
    `Shoot type: ${session?.type || "—"}`,
    `Shoot date: ${session?.startsAt || "—"}`,
    `Status: ${session?.status || "—"}`,
    "",
    "Intake answers:",
    JSON.stringify(session?.intakeAnswers || proposal?.intakeAnswers || {}, null, 2),
    "",
    `Archived at: ${new Date().toISOString()}`,
  ].join("\n");
  zip.file("client-details.txt", details);

  for (const photo of photos) {
    try {
      if (photo.storagePath.startsWith("studios/")) {
        const data = await downloadStorageBuffer(photo.storagePath);
        zip.file(`photos/${photo.kind}-${photo.id}-v${photo.version}.jpg`, data);
      }
    } catch {
      // skip missing
    }
  }

  const archiveBuffer = await zip.generateAsync({ type: "nodebuffer" });

  for (const photo of photos) {
    if (!photo.storagePath.startsWith("studios/")) continue;
    const stem = photo.storagePath.replace(/\/originals\/[^/]+$/, "");
    const base = photo.storagePath.split("/").pop()?.replace(/\.jpg$/i, "") || "";
    await Promise.all([
      deleteStorageObject(photo.storagePath).catch(() => undefined),
      deleteStorageObject(`${stem}/derivatives/${base}-thumb.webp`).catch(() => undefined),
      deleteStorageObject(`${stem}/derivatives/${base}-web.webp`).catch(() => undefined),
      deleteStorageObject(`${stem}/derivatives/${base}-wm.webp`).catch(() => undefined),
    ]);
  }

  await updateStudioDb(admin.studioId, (d) => {
    const g = d.galleries.find((x) => x.id === id);
    if (g) {
      g.status = "archived";
      g.coverPhotoUrl = undefined;
      g.updatedAt = new Date().toISOString();
    }
    d.photos = d.photos.filter((p) => p.galleryId !== id);
    const linked = d.sessions.find(
      (x) => x.id === (gallery.sessionId || gallery.shootId),
    );
    if (linked) {
      linked.status = "archived";
      linked.updatedAt = new Date().toISOString();
    }
  });

  return new NextResponse(new Uint8Array(archiveBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="archive-${gallery.title.replace(/\s+/g, "-")}.zip"`,
    },
  });
}
