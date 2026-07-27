import { NextResponse } from "next/server";
import {
  findProposalByToken,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import { recordEvent } from "@/lib/analytics";
import { resolveMediaUrl } from "@/lib/media-url";
import { notifyQuoteAccepted } from "@/lib/notify/send";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const hit = await findProposalByToken(token);
  if (!hit?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = await readStudioDb(hit.studioId);
  const proposal = db.proposals.find((p) => p.token === token);
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = db.sessions.find(
    (s) => s.id === (proposal.sessionId || proposal.shootId),
  );
  const project = session
    ? db.projects.find((c) => c.id === session.projectId)
    : db.projects.find((c) => c.id === proposal.projectId) || null;

  await recordEvent({
    type: "proposal_view",
    studioId: proposal.studioId,
    proposalId: proposal.id,
    shootId: proposal.shootId,
  });

  return NextResponse.json({
    proposal: {
      ...proposal,
    },
    studio: {
      name: db.studio.name,
      logoUrl: resolveMediaUrl(db.studio.logoUrl),
      brandTagline: db.studio.brandTagline,
    },
    clientName: project?.name,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();

  const hit = await findProposalByToken(token);
  if (!hit?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await updateStudioDb(hit.studioId, (db) => {
    const proposal = db.proposals.find((p) => p.token === token);
    if (!proposal) return null;
    if (proposal.status === "accepted") {
      return {
        proposal,
        already: true,
        projectId: proposal.projectId as string | undefined,
        clientName: null as string | null,
      };
    }
    proposal.intakeAnswers = body.intakeAnswers || {};
    proposal.selectedTierId = body.selectedTierId;
    proposal.status = "accepted";
    proposal.depositStatus = "awaited";
    proposal.updatedAt = now;
    const session = db.sessions.find(
      (s) => s.id === (proposal.sessionId || proposal.shootId),
    );
    if (session) {
      session.status = "booked";
      session.intakeAnswers = proposal.intakeAnswers;
      session.updatedAt = now;
    }
    const projectId = proposal.projectId || session?.projectId;
    const project = projectId
      ? db.projects.find((p) => p.id === projectId)
      : null;
    if (project) {
      project.stage = "booked";
      project.workflowStep = "contract";
      project.updatedAt = now;
    }
    return {
      proposal,
      already: false,
      projectId,
      clientName: project?.name || null,
    };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!result.already) {
    await recordEvent({
      type: "proposal_accept",
      studioId: result.proposal.studioId,
      proposalId: result.proposal.id,
      shootId: result.proposal.shootId,
    });
    await notifyQuoteAccepted({
      studioId: result.proposal.studioId,
      proposalId: result.proposal.id,
      projectId: result.projectId,
      title: result.proposal.title,
      clientName: result.clientName || undefined,
    });
  }

  return NextResponse.json({ proposal: result.proposal });
}
