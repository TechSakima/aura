import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb } from "@/lib/db/store";
import { studioLegalDefaults } from "@/lib/legal-defaults";
import { studioPaymentDefaults } from "@/lib/payment-defaults";

/** Quotes, contracts, questionnaires, payment links, invoices for one project (AURA-188). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const project = db.projects.find((p) => p.id === id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const questionnaires = db.questionnaireResponses.filter((r) => r.projectId === id);
  const contracts = db.contracts.filter((c) => c.projectId === id);
  const proposals = db.proposals.filter((p) => p.projectId === id);
  const invoices = db.invoices.filter((i) => i.projectId === id);
  const paymentLinks = db.paymentLinks.filter((l) => l.projectId === id && !l.archived);

  return NextResponse.json({
    questionnaires,
    questionnaireTemplates: db.questionnaireTemplates.map((t) => ({
      id: t.id,
      name: t.name,
    })),
    contracts,
    contractTemplates: db.contractTemplates,
    proposals,
    packages: db.packageTemplates.map((p) => ({ id: p.id, name: p.name })),
    invoices,
    paymentLinks,
    paymentDefaults: studioPaymentDefaults(db.studio),
    legalDefaults: studioLegalDefaults(db.studio),
  });
}
