import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import { defaultQuoteTitle } from "@/lib/copy/offering";

/** Canonical quotes list/create (AURA-157). Prefer `sessionId` over `shootId`. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || undefined;
  const db = await readStudioDb(admin.studioId);
  const quotes = projectId
    ? db.proposals.filter((p) => p.projectId === projectId)
    : db.proposals;
  return NextResponse.json({
    quotes,
    sessions: db.sessions,
    projects: db.projects,
    packages: db.packageTemplates,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const sessionId = String(body.sessionId || body.shootId || "");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 },
    );
  }

  const db = await readStudioDb(admin.studioId);
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const pkg = body.packageTemplateId
    ? db.packageTemplates.find((p) => p.id === body.packageTemplateId)
    : undefined;

  const existing = db.proposals.find(
    (p) => (p.sessionId || p.shootId) === session.id,
  );
  if (existing && body.replace !== true) {
    return NextResponse.json(
      { error: "Quote already exists for this session — send replace: true to replace", existingId: existing.id },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const proposal = {
    id: nanoid(),
    studioId: admin.studioId,
    token: publicToken(),
    projectId: session.projectId,
    sessionId: session.id,
    packageTemplateId: pkg?.id,
    status: "draft" as const,
    title: String(body.title || defaultQuoteTitle(pkg?.name || session.type)),
    moodBoard: body.moodBoard || [],
    tiers: body.tiers || pkg?.defaultPricing || [],
    inclusions: body.inclusions || pkg?.inclusions || [],
    terms: body.terms || pkg?.contractTerms || "",
    intakeSchema: body.intakeSchema || pkg?.intakeQuestions || [],
    intakeAnswers: {},
    depositStatus: "none" as const,
    createdAt: now,
    updatedAt: now,
  };

  await updateStudioDb(admin.studioId, (d) => {
    d.proposals = d.proposals.filter(
      (p) => (p.sessionId || p.shootId) !== session.id,
    );
    d.proposals.unshift(proposal);
    const s = d.sessions.find((x) => x.id === session.id);
    if (s) {
      s.proposalId = proposal.id;
      s.status = "proposed";
      s.wizardSkippedProposal = false;
      s.updatedAt = now;
    }
    const project = d.projects.find((p) => p.id === session.projectId);
    if (project) {
      if (
        !project.workflowStep ||
        project.workflowStep === "inquiry" ||
        project.workflowStep === "questionnaire"
      ) {
        project.workflowStep = "pricing";
      }
      project.updatedAt = now;
    }
  });

  return NextResponse.json({ quote: proposal, proposal });
}
