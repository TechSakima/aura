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
  const template = await updateStudioDb(admin.studioId, (db) => {
    const t = db.shotListTemplates.find((x) => x.id === id);
    if (!t) return null;
    if (body.name != null) t.name = String(body.name);
    if (body.shootType != null) t.shootType = String(body.shootType);
    if (body.items != null) t.items = body.items;
    t.updatedAt = new Date().toISOString();
    return t;
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await updateStudioDb(admin.studioId, (db) => {
    db.shotListTemplates = db.shotListTemplates.filter((t) => t.id !== id);
  });
  return NextResponse.json({ ok: true });
}
