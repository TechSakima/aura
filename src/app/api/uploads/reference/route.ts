import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { processUpload } from "@/lib/images/process";

/** Upload an example/reference image for a shot idea. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processUpload({
    buffer,
    baseName: `shot-${nanoid(8)}`,
    studioId: admin.studioId,
    folder: "ideas",
    watermark: null,
  });

  return NextResponse.json({ url: processed.webUrl });
}
