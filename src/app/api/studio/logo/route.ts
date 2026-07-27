import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import { saveBrandLogo } from "@/lib/images/process";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (typeof file === "string" || !file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "empty file" }, { status: 400 });
    }

    const logoUrl = await saveBrandLogo(buffer, admin.studioId);
    await updateStudioDb(admin.studioId, (db) => {
      db.studio.logoUrl = logoUrl;
    });
    return NextResponse.json({ logoUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Logo upload failed";
    console.error("[studio/logo]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
