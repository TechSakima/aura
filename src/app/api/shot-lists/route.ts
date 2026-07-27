import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({ templates: db.shotListTemplates });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const now = new Date().toISOString();
  const template = {
    id: nanoid(),
    studioId: admin.studioId,
    name: String(body.name || "Shot list"),
    shootType: String(body.shootType || "Weddings"),
    items: Array.isArray(body.items)
      ? body.items
      : [
          {
            id: nanoid(),
            label: "New shot",
            category: "Close-up",
            section: "Close-up",
            mustHave: true,
          },
        ],
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.shotListTemplates.unshift(template);
  });
  return NextResponse.json({ template });
}
