import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getProjectById, patchStudioDoc, readStudioDb } from "@/lib/db/store";
import { notifyStudio } from "@/lib/notify/send";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import type { QuestionnaireResponse } from "@/lib/types";

async function findByToken(token: string): Promise<{
  studioId: string;
  response: QuestionnaireResponse;
} | null> {
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.questionnaireResponses)
    .where("token", "==", token)
    .limit(1)
    .get()
    .catch(async () => {
      // Fallback scan if collection query unsupported / empty index
      return null;
    });

  if (snap && !snap.empty) {
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as QuestionnaireResponse;
    return { studioId: data.studioId, response: data };
  }

  // Tenant scan fallback for local/dev without indexes
  const studios = await db.collection(COL.studios).get();
  for (const s of studios.docs) {
    const studioDb = await readStudioDb(s.id);
    const response = studioDb.questionnaireResponses.find((r) => r.token === token);
    if (response) return { studioId: s.id, response };
  }
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const hit = await findByToken(token);
  if (!hit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const studioDb = await readStudioDb(hit.studioId);
  return NextResponse.json({
    questionnaire: {
      title: hit.response.title,
      questions: hit.response.questions,
      submittedAt: hit.response.submittedAt,
      answers: hit.response.submittedAt ? hit.response.answers : {},
    },
    studio: {
      name: studioDb.studio.name,
      logoUrl: await resolveBrowseMediaUrl(studioDb.studio.logoUrl),
      brandTagline: studioDb.studio.brandTagline,
    },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const limited = await rateLimitShared(
    `questionnaire:${token}:${clientIp(req)}`,
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

  const hit = await findByToken(token);
  if (!hit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (hit.response.submittedAt) {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }
  const body = await req.json();
  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, string>)
      : {};
  if (!hit.response.questions.length) {
    return NextResponse.json(
      { error: "This questionnaire has no questions" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();

  await patchStudioDoc(COL.questionnaireResponses, hit.response.id, {
    answers,
    submittedAt: now,
  });

  const projectId = hit.response.projectId;
  if (projectId) {
    const project = await getProjectById(projectId);
    if (
      project &&
      (project.workflowStep === "questionnaire" || !project.workflowStep)
    ) {
      await patchStudioDoc(COL.projects, projectId, {
        workflowStep: "pricing",
      });
    }
  }

  await notifyStudio({
    studioId: hit.studioId,
    type: "questionnaire_submitted",
    title: "Questionnaire completed",
    body: hit.response.title,
    href: `/admin/projects/${hit.response.projectId}#workflow`,
  });

  return NextResponse.json({ ok: true });
}
