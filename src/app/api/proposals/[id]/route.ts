import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteProposalCascade } from "@/lib/db/delete-shoot";
import { updateDb } from "@/lib/db/store";
import type { DepositStatus, ProposalStatus } from "@/lib/types";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  const proposal = await updateDb((db) => {
    const p = db.proposals.find((x) => x.id === id);
    if (!p) return null;
    if (body.title != null) p.title = String(body.title);
    if (body.status != null) p.status = body.status as ProposalStatus;
    if (body.moodBoard != null) p.moodBoard = body.moodBoard;
    if (body.tiers != null) p.tiers = body.tiers;
    if (body.inclusions != null) p.inclusions = body.inclusions;
    if (body.terms != null) p.terms = String(body.terms);
    if (body.intakeSchema != null) p.intakeSchema = body.intakeSchema;
    if (body.depositStatus != null) p.depositStatus = body.depositStatus as DepositStatus;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ proposal });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteProposalCascade(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
