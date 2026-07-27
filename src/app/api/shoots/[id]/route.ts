import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteShootCascade } from "@/lib/db/delete-shoot";
import { getShootBundle, updateStudioDb } from "@/lib/db/store";
import type { ShootStatus } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getShootBundle(id);
  if (!bundle || bundle.shoot.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const gallery = bundle.gallery
    ? (() => {
        const { downloadPinHash: _, ...safe } = bundle.gallery;
        return safe;
      })()
    : null;
  return NextResponse.json({
    shoot: bundle.shoot,
    client: bundle.client,
    gallery,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const shoot = await updateStudioDb(admin.studioId, (db) => {
    const s = db.shoots.find((x) => x.id === id);
    if (!s) return null;
    if (body.type != null) s.type = String(body.type);
    if (body.shootDate !== undefined) {
      s.shootDate = body.shootDate ? String(body.shootDate) : undefined;
    }
    if (body.status != null) s.status = body.status as ShootStatus;
    if (body.wizardSkippedProposal != null) {
      s.wizardSkippedProposal = Boolean(body.wizardSkippedProposal);
    }
    if (body.wizardSkippedPrep != null) {
      s.wizardSkippedPrep = Boolean(body.wizardSkippedPrep);
    }
    if (body.wizardAdvancedPastShootDay != null) {
      s.wizardAdvancedPastShootDay = Boolean(body.wizardAdvancedPastShootDay);
    }
    s.updatedAt = new Date().toISOString();
    return s;
  });
  if (!shoot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ shoot });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteShootCascade(admin.studioId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
