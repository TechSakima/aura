import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { publicToken } from "@/lib/tokens";
import type { CancelPolicy, Contract, ContractTemplate } from "@/lib/types";
import {
  absoluteUrl,
  emailContractToSign,
  notifyStudio,
} from "@/lib/notify/send";

function parseCancelPolicy(raw: unknown): CancelPolicy | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const untilPayment = Boolean(obj.untilPayment);
  const daysRaw = obj.daysBeforeSession;
  let daysBeforeSession: number | null | undefined;
  if (daysRaw === null || daysRaw === "") {
    daysBeforeSession = null;
  } else if (daysRaw !== undefined) {
    const n = Number(daysRaw);
    daysBeforeSession = Number.isFinite(n) ? n : null;
  }
  if (!untilPayment && daysBeforeSession == null) return undefined;
  return {
    untilPayment: untilPayment || undefined,
    daysBeforeSession,
  };
}

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
  const action = String(body.action || "send");
  const now = new Date().toISOString();
  const cancelPolicy = parseCancelPolicy(body.cancelPolicy);

  if (action === "create_template") {
    const name = String(body.name || body.title || "").trim() || "Contract";
    const templateBody = String(body.body || "").trim();
    if (!templateBody) {
      return NextResponse.json({ error: "body required" }, { status: 400 });
    }
    const template: ContractTemplate = {
      id: nanoid(),
      studioId: admin.studioId,
      name,
      body: templateBody,
      cancelPolicy,
      createdAt: now,
      updatedAt: now,
    };
    await updateStudioDb(admin.studioId, (db) => {
      db.contractTemplates.unshift(template);
    });
    return NextResponse.json({ template });
  }

  if (action === "update_template") {
    const templateId = String(body.templateId || body.id || "");
    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }
    const template = await updateStudioDb(admin.studioId, (db) => {
      const t = db.contractTemplates.find((x) => x.id === templateId);
      if (!t) return null;
      if (body.name != null || body.title != null) {
        t.name = String(body.name || body.title).trim() || t.name;
      }
      if (body.body != null) t.body = String(body.body);
      if (body.cancelPolicy !== undefined) {
        t.cancelPolicy = parseCancelPolicy(body.cancelPolicy);
      }
      t.updatedAt = now;
      return t;
    });
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ template });
  }

  const projectId = String(body.projectId || "");
  const title = String(body.title || "Contract").trim();
  const contractBody = String(body.body || "").trim();
  const templateId = body.templateId ? String(body.templateId) : undefined;
  if (!projectId || !contractBody) {
    return NextResponse.json(
      { error: "projectId and body required" },
      { status: 400 },
    );
  }

  const db0 = await readStudioDb(admin.studioId);
  const fromTemplate = templateId
    ? db0.contractTemplates.find((t) => t.id === templateId)
    : undefined;
  const policy = cancelPolicy || fromTemplate?.cancelPolicy;

  const contract: Contract = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    templateId: fromTemplate?.id,
    title,
    body: contractBody,
    token: publicToken(),
    status: "awaiting_signature",
    cancelPolicy: policy,
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
    if (project) {
      project.workflowStep = "contract";
      project.updatedAt = now;
    }
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
    href: `/admin/projects/${projectId}`,
  });
  return NextResponse.json({ contract, url });
}
