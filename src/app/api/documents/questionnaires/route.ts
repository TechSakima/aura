import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    templates: db.questionnaireTemplates,
    responses: db.questionnaireResponses,
    contractTemplates: db.contractTemplates,
    packageTemplates: db.packageTemplates.map((p) => ({
      id: p.id,
      name: p.name,
    })),
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
  });

  const url = absoluteUrl(`/q/${response.token}`);

  await emailQuestionnaireInvite({
    studioId: admin.studioId,
    to: project.email,
    clientName: project.name,
    title: response.title,
    token: response.token,
  });
  await notifyStudio({
    studioId: admin.studioId,
    type: "questionnaire_sent",
    title: "Questionnaire sent",
    body: `${project.name} · ${response.title}`,
    href: "/admin/documents",
  });

  return NextResponse.json({ response, url });
}
