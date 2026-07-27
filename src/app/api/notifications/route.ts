import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  const items = [...db.notifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return NextResponse.json({
    notifications: items.slice(0, 40),
    unread: items.filter((n) => !n.read).length,
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.map(String)
    : body.id
      ? [String(body.id)]
      : [];
  const markAll = Boolean(body.markAllRead);

  await updateStudioDb(admin.studioId, (db) => {
    for (const n of db.notifications) {
      if (markAll || ids.includes(n.id)) n.read = true;
    }
  });
  return NextResponse.json({ ok: true });
}
