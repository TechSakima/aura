import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({ clients: db.clients });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name || !body.email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const client = {
    id: nanoid(),
    name: String(body.name),
    email: String(body.email),
    phone: body.phone ? String(body.phone) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    createdAt: now,
    updatedAt: now,
  };
  await updateDb((db) => {
    db.clients.unshift(client);
  });
  return NextResponse.json({ client });
}
