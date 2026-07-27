import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import { formDataFiles } from "@/lib/form-data";
import { processUpload } from "@/lib/images/process";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const form = await req.formData();
    const files = formDataFiles(form, "files");
    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const items: { id: string; url: string; caption: string }[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processUpload({
        buffer,
        baseName: `mood-${id}-${nanoid(8)}`,
        studioId: admin.studioId,
        folder: "moodboards",
        watermark: null,
      });
      items.push({
        id: nanoid(),
        url: processed.webUrl,
        caption: file.name || "Mood",
      });
    }

    const proposal = await updateStudioDb(admin.studioId, (db) => {
      const p = db.proposals.find((x) => x.id === id);
      if (!p) return null;
      p.moodBoard = [...p.moodBoard, ...items];
      p.updatedAt = new Date().toISOString();
      return p;
    });

    if (!proposal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ proposal });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("[moodboard]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
