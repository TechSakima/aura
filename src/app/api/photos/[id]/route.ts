import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deletePhotosByIds } from "@/lib/db/delete-shoot";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await deletePhotosByIds([id]);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
