import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { processUpload } from "@/lib/images/process";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({ ideas: db.ideaCards });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const now = new Date().toISOString();

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    let referenceImageUrl: string | undefined;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processUpload({
        buffer,
        baseName: `idea-${nanoid(8)}`,
        studioId: admin.studioId,
        folder: "ideas",
        watermark: null,
      });
      referenceImageUrl = processed.webUrl;
    }
    const tagsRaw = String(form.get("tags") || "");
    const idea = {
      id: nanoid(),
      studioId: admin.studioId,
      title: String(form.get("title") || "Untitled idea"),
      category: String(form.get("category") || "General"),
      notes: form.get("notes") ? String(form.get("notes")) : undefined,
      referenceImageUrl,
      tags: tagsRaw
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      createdAt: now,
      updatedAt: now,
    };
    await updateStudioDb(admin.studioId, (db) => {
      db.ideaCards.unshift(idea);
    });
    return NextResponse.json({ idea });
  }

  const body = await req.json();
  const idea = {
    id: nanoid(),
    studioId: admin.studioId,
    title: String(body.title || "Untitled idea"),
    category: String(body.category || "General"),
    notes: body.notes ? String(body.notes) : undefined,
    referenceImageUrl: body.referenceImageUrl
      ? String(body.referenceImageUrl)
      : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.ideaCards.unshift(idea);
  });
  return NextResponse.json({ idea });
}
