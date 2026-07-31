import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import {
  parseAdminListPage,
  slicePage,
} from "@/lib/admin-list-page";
import {
  listContractTemplatesForStudio,
  listPackageNameOptionsForStudio,
  listQuestionnaireResponsesForStudio,
  listQuestionnaireTemplatesForStudio,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import {
  absoluteUrl,
  emailQuestionnaireInvite,
  notifyStudio,
} from "@/lib/notify/send";
import { publicToken } from "@/lib/tokens";
import type {
  IntakeQuestion,
  QuestionnaireResponse,
  QuestionnaireTemplate,
} from "@/lib/types";

/** Scoped reads + paginated responses (AURA-268). */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { offset, limit } = parseAdminListPage(url);

  const [templates, responses, contractTemplates, packageTemplates] =
    await Promise.all([
      listQuestionnaireTemplatesForStudio(admin.studioId),
      listQuestionnaireResponsesForStudio(admin.studioId),
      listContractTemplatesForStudio(admin.studioId),
      listPackageNameOptionsForStudio(admin.studioId),
    ]);

  const sorted = [...responses].sort((a, b) =>
    (b.submittedAt || b.createdAt || "").localeCompare(
      a.submittedAt || a.createdAt || "",
    ),
  );
  const page = slicePage(sorted, offset, limit);

  return NextResponse.json({
    templates,
    responses: page.items,
    contractTemplates,
    packageTemplates,
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
  const db = await readStudioDb(admin.studioId);

  if (action === "create_template") {
    const name = String(body.name || "").trim() || "Questionnaire";
    const questions: IntakeQuestion[] = Array.isArray(body.questions)
      ? body.questions
      : [
          {
            id: nanoid(8),
            label: "Tell us about your session goals",
            type: "textarea",
            required: true,
          },
          {
            id: nanoid(8),
            label: "Preferred location",
            type: "text",
          },
        ];
    const template: QuestionnaireTemplate = {
      id: nanoid(),
      studioId: admin.studioId,
      name,
      questions,
      createdAt: now,
      updatedAt: now,
    };
    await updateStudioDb(admin.studioId, (d) => {
      d.questionnaireTemplates.unshift(template);
    });
    return NextResponse.json({ template });
  }

  if (action === "update_template") {
    const templateId = String(body.templateId || body.id || "");
    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }
    const template = await updateStudioDb(admin.studioId, (d) => {
      const t = d.questionnaireTemplates.find((x) => x.id === templateId);
      if (!t) return null;
      if (body.name != null) {
        t.name = String(body.name).trim() || t.name;
      }
      if (Array.isArray(body.questions)) {
        t.questions = body.questions.map(
          (q: Partial<IntakeQuestion> & { label?: string }) => ({
            id: String(q.id || nanoid(8)),
            label: String(q.label || "").trim() || "Question",
            type:
              q.type === "textarea" ||
              q.type === "select" ||
              q.type === "date"
                ? q.type
                : "text",
            required: Boolean(q.required),
            options: Array.isArray(q.options)
              ? q.options.map(String).filter(Boolean)
              : undefined,
          }),
        );
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
  const templateId = String(body.templateId || "");
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "Project required" }, { status: 400 });
  }
  let template = db.questionnaireTemplates.find((t) => t.id === templateId);
  if (!template && db.questionnaireTemplates[0]) {
    template = db.questionnaireTemplates[0];
  }
  if (!template) {
    // Auto-create a default template on first send
    template = {
      id: nanoid(),
      studioId: admin.studioId,
      name: "Session questionnaire",
      questions: [
        {
          id: nanoid(8),
          label: "What should we know before the session?",
          type: "textarea",
          required: true,
        },
        {
          id: nanoid(8),
          label: "Preferred date flexibility",
          type: "text",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    await updateStudioDb(admin.studioId, (d) => {
      d.questionnaireTemplates.unshift(template!);
    });
  }

  const response: QuestionnaireResponse = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    templateId: template.id,
    token: publicToken(),
    title: String(body.title || template.name),
    questions: template.questions,
    answers: {},
    createdAt: now,
    updatedAt: now,
  };

  await updateStudioDb(admin.studioId, (d) => {
    d.questionnaireResponses.unshift(response);
    const p = d.projects.find((x) => x.id === projectId);
    if (p) {
      p.workflowStep = "questionnaire";
      p.updatedAt = now;
    }
  });

  const url = absoluteUrl(`/q/${response.token}`);
  const to = String(project.email || "").trim();
  let emailed = false;
  if (to.includes("@")) {
    await emailQuestionnaireInvite({
      studioId: admin.studioId,
      to,
      clientName: project.name,
      title: response.title,
      token: response.token,
      projectId,
    });
    emailed = true;
  }
  await notifyStudio({
    studioId: admin.studioId,
    type: "questionnaire_sent",
    title: emailed ? "Questionnaire sent" : "Questionnaire ready",
    body: `${project.name} · ${response.title}`,
    href: `/admin/projects/${projectId}#workflow`,
  });

  return NextResponse.json({ response, url, emailed });
}
