import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import type { ShotItem } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await readStudioDb(admin.studioId);
  const plan =
    db.shootPlans.find((p) => p.sessionId === id || p.shootId === id) || null;
  const session = db.sessions.find((s) => s.id === id) || null;
  return NextResponse.json({
    plan,
    shoot: session,
    templates: db.shotListTemplates,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const now = new Date().toISOString();

  const plan = await updateStudioDb(admin.studioId, (db) => {
    const session = db.sessions.find((s) => s.id === id);
    if (!session) return null;
    const existing = db.shootPlans.find(
      (p) => p.sessionId === id || p.shootId === id,
    );
    if (existing && !body.force) return existing;

    const template = body.templateId
      ? db.shotListTemplates.find((t) => t.id === body.templateId)
      : db.shotListTemplates.find((t) => t.shootType === session.type) ||
        db.shotListTemplates[0];

    const items: ShotItem[] = (template?.items || []).map((item) => {
      const category = item.category || item.section || "Detail";
      return {
        id: nanoid(),
        label: item.label,
        category,
        section: category,
        mustHave: item.mustHave,
        done: false,
        referenceImageUrl: item.referenceImageUrl,
        ideaCardId: item.ideaCardId,
        note: item.note,
      };
    });

    // Merge intake must-haves as extra items
    if (session.intakeAnswers) {
      for (const [key, value] of Object.entries(session.intakeAnswers)) {
        if (!value?.trim()) continue;
        const qLabel =
          db.proposals
            .find((p) => p.id === session.proposalId)
            ?.intakeSchema.find((q) => q.id === key)?.label || key;
        if (/must|moment|pose|shot/i.test(qLabel) || /must|moment/i.test(value)) {
          items.push({
            id: nanoid(),
            label: value.slice(0, 120),
            category: "Detail",
            section: "Detail",
            mustHave: true,
            done: false,
            note: `From intake: ${qLabel}`,
          });
        }
      }
    }

    const next = {
      id: existing?.id || nanoid(),
      studioId: admin.studioId,
      sessionId: id,
      shootId: id,
      title: String(body.title || `${session.type} plan`),
      templateId: template?.id,
      items,
      dayNotes: existing?.dayNotes || "",
      timeline: existing?.timeline || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existing) {
      Object.assign(existing, next);
      return existing;
    }
    db.shootPlans.unshift(next);
    return next;
  });

  if (!plan) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  const plan = await updateStudioDb(admin.studioId, (db) => {
    const p = db.shootPlans.find((x) => x.sessionId === id || x.shootId === id);
    if (!p) return null;
    if (body.title != null) p.title = String(body.title);
    if (body.dayNotes != null) p.dayNotes = String(body.dayNotes);
    if (body.timeline != null) p.timeline = body.timeline;
    if (body.items != null) p.items = body.items;
    if (body.itemId != null) {
      const item = p.items.find((i) => i.id === body.itemId);
      if (item) {
        if (body.done != null) item.done = Boolean(body.done);
        if (body.note != null) item.note = String(body.note);
        if (body.flagged != null) item.flagged = Boolean(body.flagged);
      }
    }
    if (body.complete) {
      p.completedAt = new Date().toISOString();
    }
    p.updatedAt = new Date().toISOString();
    return p;
  });

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json({ plan });
}
