import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { COL } from "@/lib/db/collections";
import { getGalleryBundle, patchStudioDoc, readStudioDb } from "@/lib/db/store";
import { emailGalleryLive } from "@/lib/notify/send";

/** Email the public gallery link to the client (or given address). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getGalleryBundle(id);
  if (!bundle || bundle.gallery.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const to = String(body.to || "").trim().toLowerCase();
  if (!to) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const db = await readStudioDb(admin.studioId);
  const project = bundle.client?.email === to
    ? bundle.client
    : db.projects.find((p) => p.email?.trim().toLowerCase() === to);

  const projectId =
    bundle.client?.id ||
    bundle.gallery.projectId ||
    project?.id ||
    undefined;
  const sessionId =
    bundle.gallery.sessionId ||
    bundle.gallery.shootId ||
    bundle.shoot?.id ||
    undefined;

  const result = await emailGalleryLive({
    studioId: admin.studioId,
    to,
    clientName: project?.name || "there",
    galleryTitle: bundle.gallery.title,
    publicToken: bundle.gallery.publicToken,
    projectId,
    sessionId,
  });

  if (!result.ok && "skipped" in result && result.skipped) {
    return NextResponse.json({ ok: true, emailed: false });
  }
  if (!result.ok) {
    return NextResponse.json(
      { error: "error" in result ? result.error : "Send failed" },
      { status: 502 },
    );
  }

  const now = new Date().toISOString();
  await patchStudioDoc(COL.galleries, id, {
    clientEmailedAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, emailed: true });
}
