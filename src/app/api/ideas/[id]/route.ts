import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const idea = await updateStudioDb(admin.studioId, (db) => {
    const i = db.ideaCards.find((x) => x.id === id);
    if (!i) return null;
    if (body.title != null) i.title = String(body.title);
    if (body.category != null) i.category = String(body.category);
    if (body.notes != null) i.notes = String(body.notes);
    if (body.referenceImageUrl != null) {
      i.referenceImageUrl = String(body.referenceImageUrl);
    }
    if (body.tags != null) i.tags = body.tags.map(String);
    i.updatedAt = new Date().toISOString();
    return i;
  });
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ idea });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await updateStudioDb(admin.studioId, (db) => {
    db.ideaCards = db.ideaCards.filter((i) => i.id !== id);
  });
  return NextResponse.json({ ok: true });
}
