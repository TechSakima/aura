import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";
import { reprocessGalleryWatermarks } from "@/lib/images/rewatermark";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const result = await updateDb(async (db) => {
    const gallery = db.galleries.find((g) => g.id === id);
    if (!gallery) return null;
    return reprocessGalleryWatermarks(db, id);
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}
