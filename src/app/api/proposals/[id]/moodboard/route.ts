import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";
import { processUpload } from "@/lib/images/process";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const items: { id: string; url: string; caption: string }[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processUpload({
      buffer,
      baseName: `mood-${id}-${nanoid(8)}`,
      folder: "moodboards",
      watermark: null,
    });
    items.push({
      id: nanoid(),
      url: processed.webUrl,
      caption: file.name,
    });
  }

  const proposal = await updateDb((db) => {
    const p = db.proposals.find((x) => x.id === id);
    if (!p) return null;
    p.moodBoard = [...p.moodBoard, ...items];
    p.updatedAt = new Date().toISOString();
    return p;
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ proposal });
}
