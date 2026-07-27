import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { formDataFile } from "@/lib/form-data";
import { processUpload } from "@/lib/images/process";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Upload an example/reference image for a shot idea. */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = formDataFile(form, "file");
    if (!file || file.size === 0) {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("[uploads/reference]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
