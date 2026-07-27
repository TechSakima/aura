import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import type { Contract } from "@/lib/types";
import {
  absoluteUrl,
  emailContractToSign,
  notifyStudio,
} from "@/lib/notify/send";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    contracts: db.contracts,
    templates: db.contractTemplates,
    questionnaires: db.questionnaireTemplates,
    responses: db.questionnaireResponses,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = String(body.projectId || "");
  const title = String(body.title || "Contract").trim();
  const contractBody = String(body.body || "").trim();
  if (!projectId || !contractBody) {
    return NextResponse.json(
      { error: "projectId and body required" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const contract: Contract = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    title,
    body: contractBody,
    token: publicToken(),
    status: "awaiting_signature",
    createdAt: now,
    updatedAt: now,
  };
  let projectEmail = "";
  let projectName = "";
  await updateStudioDb(admin.studioId, (db) => {
    db.contracts.unshift(contract);
    const project = db.projects.find((p) => p.id === projectId);
    projectEmail = project?.email || "";
    projectName = project?.name || "";
  });
  const url = absoluteUrl(`/c/${contract.token}`);
  if (projectEmail) {
    await emailContractToSign({
      studioId: admin.studioId,
      to: projectEmail,
      clientName: projectName,
      title,
      token: contract.token,
    });
  }
  await notifyStudio({
    studioId: admin.studioId,
    type: "contract_sent",
    title: "Contract sent",
    body: title,
    href: "/admin/documents",
  });
  return NextResponse.json({ contract, url });
}
