import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deletePhotosByIds } from "@/lib/db/delete-shoot";

/** Bulk delete photos: { ids: string[] } */
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  if (!ids.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const deleted = await deletePhotosByIds(admin.studioId, ids);
  return NextResponse.json({ ok: true, deleted });
}
