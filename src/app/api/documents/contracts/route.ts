import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import {
  parseAdminListPage,
  slicePage,
} from "@/lib/admin-list-page";
import {
  listContractsForStudio,
  listContractTemplatesForStudio,
  listQuestionnaireTemplatesForStudio,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency";
import { publicToken } from "@/lib/tokens";
import type { CancelPolicy, Contract, ContractTemplate } from "@/lib/types";
import { defaultContractBody } from "@/lib/contracts/defaults";
import { resolveDefaultContractTemplate } from "@/lib/legal-defaults";
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

/** Scoped reads + paginated contract summaries without bodies (AURA-268). */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { offset, limit } = parseAdminListPage(url);

  const [contracts, templates, questionnaires] = await Promise.all([
    listContractsForStudio(admin.studioId),
    listContractTemplatesForStudio(admin.studioId),
    listQuestionnaireTemplatesForStudio(admin.studioId),
  ]);

  const sorted = [...contracts].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
  const page = slicePage(sorted, offset, limit);
  const summaries = page.items.map(({ body: _body, ...rest }) => rest);

  return NextResponse.json({
    contracts: summaries,
    templates,
    questionnaires,
    /** Responses paginate via `/api/documents/questionnaires` (AURA-268). */
    responses: [],
    total: page.total,
    hasMore: page.hasMore,
    offset,
    limit,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const action = String(body.action || "send");
  const now = new Date().toISOString();
  const cancelPolicy = parseCancelPolicy(body.cancelPolicy);
  const idempotencyKey = readIdempotencyKey(req);

  if (action === "create_template") {
    const name = String(body.name || body.title || "").trim() || "Photography agreement";
    const templateBody =
      String(body.body || "").trim() || defaultContractBody();
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
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId required" },
      { status: 400 },
    );
  }

  /** Draft for admin `/c/` preview before send (AURA-133). */
  if (action === "preview") {
    const db0 = await readStudioDb(admin.studioId);
    const project = db0.projects.find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const templateId = body.templateId ? String(body.templateId) : undefined;
    const fromTemplate = templateId
      ? db0.contractTemplates.find((t) => t.id === templateId)
      : resolveDefaultContractTemplate(db0);
    const title =
      String(body.title || "").trim() ||
      fromTemplate?.name ||
      "Photography agreement";
    const contractBody =
      String(body.body || "").trim() ||
      fromTemplate?.body ||
      defaultContractBody();
    const policy = cancelPolicy || fromTemplate?.cancelPolicy;

    const contract = await updateStudioDb(admin.studioId, (db) => {
      const existing = db.contracts.find(
        (c) => c.projectId === projectId && c.status === "draft",
      );
      if (existing) {
        existing.title = title;
        existing.body = contractBody;
        existing.templateId = fromTemplate?.id;
        existing.cancelPolicy = policy;
        existing.updatedAt = now;
        return existing;
      }
      const created: Contract = {
        id: nanoid(),
        studioId: admin.studioId,
        projectId,
        templateId: fromTemplate?.id,
        title,
        body: contractBody,
        token: publicToken(),
        status: "draft",
        cancelPolicy: policy,
        createdAt: now,
        updatedAt: now,
      };
      db.contracts.unshift(created);
      return created;
    });

    return NextResponse.json({
      contract,
      url: absoluteUrl(`/c/${contract.token}`),
      preview: true,
    });
  }

  return withIdempotency(
    idempotencyKey,
    `contract-send/${admin.studioId}/${projectId}`,
    async () => {
      const db0 = await readStudioDb(admin.studioId);
      const templateId = body.templateId ? String(body.templateId) : undefined;
      const fromTemplate = templateId
        ? db0.contractTemplates.find((t) => t.id === templateId)
        : resolveDefaultContractTemplate(db0);
      const title =
        String(body.title || "").trim() ||
        fromTemplate?.name ||
        "Photography agreement";
      const contractBody =
        String(body.body || "").trim() ||
        fromTemplate?.body ||
        defaultContractBody();
      const policy = cancelPolicy || fromTemplate?.cancelPolicy;

      let projectEmail = "";
      let projectName = "";
      const contract = await updateStudioDb(admin.studioId, (db) => {
        const project = db.projects.find((p) => p.id === projectId);
        projectEmail = project?.email || "";
        projectName = project?.name || "";
        if (project) {
          project.workflowStep = "contract";
          project.updatedAt = now;
        }

        const draft = db.contracts.find(
          (c) => c.projectId === projectId && c.status === "draft",
        );
        if (draft) {
          draft.title = title;
          draft.body = contractBody;
          draft.templateId = fromTemplate?.id;
          draft.cancelPolicy = policy;
          draft.status = "awaiting_signature";
          draft.updatedAt = now;
          return draft;
        }

        const created: Contract = {
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
        db.contracts.unshift(created);
        return created;
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
    },
  );
}
