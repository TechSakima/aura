import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import { defaultQuoteTitle } from "@/lib/copy/offering";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    proposals: db.proposals,
    shoots: db.sessions,
    clients: db.projects,
    packages: db.packageTemplates,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.shootId) {
    return NextResponse.json({ error: "shootId required" }, { status: 400 });
  }

  const db = await readStudioDb(admin.studioId);
  const session = db.sessions.find((s) => s.id === body.shootId);
  if (!session) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });

  const pkg = body.packageTemplateId
    ? db.packageTemplates.find((p) => p.id === body.packageTemplateId)
    : undefined;

  const now = new Date().toISOString();
  const proposal = {
    id: nanoid(),
    studioId: admin.studioId,
    token: publicToken(),
    projectId: session.projectId,
    sessionId: session.id,
    shootId: session.id,
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
    // Replace any existing proposal for this shoot (change package)
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

  return NextResponse.json({ proposal });
}
