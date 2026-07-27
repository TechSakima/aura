import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    proposals: db.proposals,
    shoots: db.shoots,
    clients: db.clients,
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
  const shoot = db.shoots.find((s) => s.id === body.shootId);
  if (!shoot) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });

  const pkg = body.packageTemplateId
    ? db.packageTemplates.find((p) => p.id === body.packageTemplateId)
    : undefined;

  const now = new Date().toISOString();
  const proposal = {
    id: nanoid(),
    studioId: admin.studioId,
    token: publicToken(),
    shootId: shoot.id,
    packageTemplateId: pkg?.id,
    status: "draft" as const,
    title: String(body.title || `${pkg?.name || shoot.type} Quote`),
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
    d.proposals = d.proposals.filter((p) => p.shootId !== shoot.id);
    d.proposals.unshift(proposal);
    const s = d.shoots.find((x) => x.id === shoot.id);
    if (s) {
      s.proposalId = proposal.id;
      s.status = "proposed";
      s.wizardSkippedProposal = false;
      s.updatedAt = now;
    }
  });

  return NextResponse.json({ proposal });
}
