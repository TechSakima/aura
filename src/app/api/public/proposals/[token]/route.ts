import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { resolveMediaUrl } from "@/lib/media-url";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const db = await readDb();
  const proposal = db.proposals.find((p) => p.token === token);
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const shoot = db.shoots.find((s) => s.id === proposal.shootId);
  const client = shoot ? db.clients.find((c) => c.id === shoot.clientId) : null;

  await recordEvent({
    type: "proposal_view",
    proposalId: proposal.id,
    shootId: proposal.shootId,
  });

  return NextResponse.json({
    proposal: {
      ...proposal,
      // never expose internal ids unnecessarily beyond what's needed
    },
    studio: {
      name: db.studio.name,
      logoUrl: resolveMediaUrl(db.studio.logoUrl),
      brandTagline: db.studio.brandTagline,
    },
    clientName: client?.name,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();

  const result = await updateDb((db) => {
    const proposal = db.proposals.find((p) => p.token === token);
    if (!proposal) return null;
    if (proposal.status === "accepted") {
      return { proposal, already: true };
    }
    proposal.intakeAnswers = body.intakeAnswers || {};
    proposal.selectedTierId = body.selectedTierId;
    proposal.status = "accepted";
    proposal.depositStatus = "awaited";
    proposal.updatedAt = now;
    const shoot = db.shoots.find((s) => s.id === proposal.shootId);
    if (shoot) {
      shoot.status = "booked";
      shoot.intakeAnswers = proposal.intakeAnswers;
      shoot.updatedAt = now;
    }
    return { proposal, already: false };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!result.already) {
    await recordEvent({
      type: "proposal_accept",
      proposalId: result.proposal.id,
      shootId: result.proposal.shootId,
    });
  }

  return NextResponse.json({ proposal: result.proposal });
}
