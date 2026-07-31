import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import {
  findProposalByToken,
  getProjectById,
  getSessionById,
  patchStudioDoc,
  readStudioDb,
} from "@/lib/db/store";
import { linkedSessionId, recordEvent } from "@/lib/analytics";
import { resolveBrowseMediaUrl, resolveBrowseMediaUrls } from "@/lib/media-url-server";
import { notifyQuoteAccepted } from "@/lib/notify/send";
import { assertPublicProposalAccess } from "@/lib/public-access";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import { toPublicProposal } from "@/lib/public-proposal";
import { resolveQuoteAcceptNext } from "@/lib/workflow/quote-next";
import type { Proposal } from "@/lib/types";

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

  const access = await assertPublicProposalAccess(proposal);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const session = db.sessions.find(
    (s) => s.id === linkedSessionId(proposal),
  );
  const project = session
    ? db.projects.find((c) => c.id === session.projectId)
    : db.projects.find((c) => c.id === proposal.projectId) || null;

  if (!access.preview) {
    await recordEvent({
      type: "proposal_view",
      studioId: proposal.studioId,
      proposalId: proposal.id,
      sessionId: linkedSessionId(proposal),
      projectId: project?.id || proposal.projectId,
    });
  }

  const next =
    proposal.status === "accepted"
      ? resolveQuoteAcceptNext(db, project?.id || proposal.projectId)
      : undefined;

  const moodBoard = await resolveBrowseMediaUrls(
    proposal.moodBoard.map((m) => m.url),
  );
  const moodItems = proposal.moodBoard.map((m, i) => ({
    ...m,
    url: moodBoard[i] || m.url,
  }));

  return NextResponse.json({
    proposal: toPublicProposal(proposal, moodItems),
    studio: {
      name: db.studio.name,
      logoUrl: await resolveBrowseMediaUrl(db.studio.logoUrl),
      brandTagline: db.studio.brandTagline,
      theme: db.studio.theme,
    },
    clientName: project?.name,
    projectName: project?.name,
    preview: access.preview || undefined,
    next,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const limited = await rateLimitShared(
    `proposal-accept:${token}:${clientIp(req)}`,
    6,
    60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const hit = await findProposalByToken(token);
  if (!hit?.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await assertPublicProposalAccess(hit, { accept: true });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  let proposal: Proposal = hit;
  let already = false;
  let projectId = proposal.projectId as string | undefined;
  let clientName: string | null = null;

  if (proposal.status === "accepted") {
    already = true;
  } else if (proposal.status !== "sent") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    const intakeAnswers = body.intakeAnswers || {};
    const selectedTierId = body.selectedTierId;
    await patchStudioDoc(COL.proposals, proposal.id, {
      intakeAnswers,
      selectedTierId,
      status: "accepted",
      depositStatus: "awaited",
    });
    proposal = {
      ...proposal,
      intakeAnswers,
      selectedTierId,
      status: "accepted",
      depositStatus: "awaited",
      updatedAt: now,
    };

    const sessionId = linkedSessionId(proposal);
    if (sessionId) {
      await patchStudioDoc(COL.projectSessions, sessionId, {
        status: "booked",
        intakeAnswers,
      });
      const session = await getSessionById(sessionId);
      if (session?.projectId) projectId = session.projectId;
    }

    if (projectId) {
      await patchStudioDoc(COL.projects, projectId, {
        stage: "booked",
        workflowStep: "contract",
      });
      const project = await getProjectById(projectId);
      clientName = project?.name || null;
    }
  }

  if (!already) {
    await recordEvent({
      type: "proposal_accept",
      studioId: proposal.studioId,
      proposalId: proposal.id,
      sessionId: linkedSessionId(proposal),
      projectId: projectId || proposal.projectId,
    });
    await notifyQuoteAccepted({
      studioId: proposal.studioId,
      proposalId: proposal.id,
      projectId,
      title: proposal.title,
      clientName: clientName || undefined,
    });
  }

  const db = await readStudioDb(hit.studioId);
  const next = resolveQuoteAcceptNext(db, projectId);

  return NextResponse.json({
    proposal: toPublicProposal(proposal),
    next,
  });
}
