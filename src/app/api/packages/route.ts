import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({ packages: db.packageTemplates });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const now = new Date().toISOString();
  const pkg = {
    id: nanoid(),
    studioId: admin.studioId,
    name: String(body.name || "Untitled package"),
    defaultPricing: body.defaultPricing || [],
    contractTerms: String(body.contractTerms || ""),
    inclusions: body.inclusions || [],
    intakeQuestions: body.intakeQuestions || [],
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.packageTemplates.push(pkg);
  });
  return NextResponse.json({ package: pkg });
}
