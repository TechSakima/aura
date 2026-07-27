import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  const now = Date.now();
  const soon = now + 7 * 24 * 60 * 60 * 1000;

  const awaitingProposals = db.proposals.filter((p) => p.status === "sent");
  const activeShoots = db.shoots.filter(
    (s) => !["archived"].includes(s.status),
  );
  const expiringGalleries = db.galleries.filter((g) => {
    if (g.status !== "live") return false;
    const t = new Date(g.expiresAt).getTime();
    return t <= soon;
  });
  const archiveFlags = db.galleries.filter((g) => {
    if (g.status === "archived") return false;
    return new Date(g.expiresAt).getTime() <= now || g.status === "expired";
  });

  return NextResponse.json({
    studio: { name: db.studio.name, brandTagline: db.studio.brandTagline },
    counts: {
      clients: db.clients.length,
      shoots: db.shoots.length,
      quotes: db.proposals.length,
      galleries: db.galleries.length,
    },
    awaitingProposals,
    activeShoots,
    expiringGalleries,
    archiveFlags,
  });
}
