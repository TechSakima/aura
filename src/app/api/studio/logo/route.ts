import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";
import { saveBrandLogo } from "@/lib/images/process";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const logoUrl = await saveBrandLogo(buffer);
  await updateDb((db) => {
    db.studio.logoUrl = logoUrl;
  });
  return NextResponse.json({ logoUrl });
}
