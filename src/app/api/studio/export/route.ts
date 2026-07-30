import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";
import { buildStudioExport } from "@/lib/studio-export";

export const runtime = "nodejs";

/** Studio profile + projects/sessions metadata (no secrets, no media bytes). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readStudioDb(admin.studioId);
  const payload = buildStudioExport(db);
  const slug =
    (db.studio.name || "studio")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "studio";
  const day = new Date().toISOString().slice(0, 10);
  const filename = `aura-${slug}-${day}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
