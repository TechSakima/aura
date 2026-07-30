import { NextResponse } from "next/server";
import { getSessionToken, requireAdmin } from "@/lib/auth";
import {
  deleteSessionsForUid,
  listSessionsForUid,
} from "@/lib/db/store";

/** List this owner's Aura sign-in sessions (no raw tokens exposed). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const current = await getSessionToken();
  const sessions = await listSessionsForUid(admin.uid);
  const now = Date.now();
  return NextResponse.json({
    sessions: sessions
      .filter((s) => new Date(s.expiresAt).getTime() > now)
      .map((s) => ({
        expiresAt: s.expiresAt,
        current: Boolean(current && s.token === current),
      }))
      .sort((a, b) => {
        if (a.current === b.current) {
          return a.expiresAt.localeCompare(b.expiresAt);
        }
        return a.current ? -1 : 1;
      }),
  });
}

/** Sign out every other device; keep the current cookie session. */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const current = await getSessionToken();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await deleteSessionsForUid(admin.uid, current);
  return NextResponse.json({ ok: true, deleted });
}
