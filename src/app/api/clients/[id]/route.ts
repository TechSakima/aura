import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getClientBundle, updateStudioDb } from "@/lib/db/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getClientBundle(id);
  if (!bundle || bundle.client.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const client = await updateStudioDb(admin.studioId, (db) => {
    const c = db.clients.find((x) => x.id === id);
    if (!c) return null;
    if (body.name != null) c.name = String(body.name);
    if (body.email != null) c.email = String(body.email);
    if (body.phone !== undefined) c.phone = body.phone ? String(body.phone) : undefined;
    if (body.notes !== undefined) c.notes = body.notes ? String(body.notes) : undefined;
    c.updatedAt = new Date().toISOString();
    return c;
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await updateStudioDb(admin.studioId, (db) => {
    db.clients = db.clients.filter((c) => c.id !== id);
  });
  return NextResponse.json({ ok: true });
}
