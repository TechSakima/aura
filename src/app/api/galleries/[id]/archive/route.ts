import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";
import { deleteStorageObject, downloadStorageBuffer } from "@/lib/storage/upload";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readDb();
  const gallery = db.galleries.find((g) => g.id === id);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shoot = db.shoots.find((s) => s.id === gallery.shootId);
  const client = shoot ? db.clients.find((c) => c.id === shoot.clientId) : null;
  const proposal = shoot?.proposalId
    ? db.proposals.find((p) => p.id === shoot.proposalId)
    : null;
  const photos = db.photos.filter((p) => p.galleryId === id);

  const zip = new JSZip();
  const details = [
    `Gallery: ${gallery.title}`,
    `Client: ${client?.name || "—"}`,
    `Email: ${client?.email || "—"}`,
    `Phone: ${client?.phone || "—"}`,
    `Shoot type: ${shoot?.type || "—"}`,
    `Shoot date: ${shoot?.shootDate || "—"}`,
    `Status: ${shoot?.status || "—"}`,
    "",
    "Intake answers:",
    JSON.stringify(shoot?.intakeAnswers || proposal?.intakeAnswers || {}, null, 2),
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

  await updateDb((d) => {
    const g = d.galleries.find((x) => x.id === id);
    if (g) {
      g.status = "archived";
      g.coverPhotoUrl = undefined;
      g.updatedAt = new Date().toISOString();
    }
    d.photos = d.photos.filter((p) => p.galleryId !== id);
    const s = d.shoots.find((x) => x.id === gallery.shootId);
    if (s) {
      s.status = "archived";
      s.updatedAt = new Date().toISOString();
    }
  });

  return new NextResponse(new Uint8Array(archiveBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="archive-${gallery.title.replace(/\s+/g, "-")}.zip"`,
    },
  });
}
