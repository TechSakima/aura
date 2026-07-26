import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";
import type { ShootStatus } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({
    shoots: db.shoots,
    clients: db.clients,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.clientId || !body.type) {
    return NextResponse.json({ error: "clientId and type required" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const shoot = {
    id: nanoid(),
    clientId: String(body.clientId),
    type: String(body.type),
    shootDate: body.shootDate ? String(body.shootDate) : undefined,
    status: (body.status as ShootStatus) || "inquiry",
    createdAt: now,
    updatedAt: now,
  };
  await updateDb((db) => {
    db.shoots.unshift(shoot);
  });
  return NextResponse.json({ shoot });
}
