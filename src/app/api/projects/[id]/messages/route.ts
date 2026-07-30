import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { COL } from "@/lib/db/collections";
import {
  appendStudioDoc,
  getProjectById,
  getSessionById,
  getStudioDoc,
  listContactMessagesForProject,
} from "@/lib/db/store";
import { emailProjectClientReply } from "@/lib/notify/send";
import {
  contactSourceLabel,
  stripContactHtml,
  stripContactMessage,
} from "@/lib/public-contact-server";
import { rateLimit } from "@/lib/rate-limit";
import type { ContactMessage } from "@/lib/types";

function mapMessage(m: ContactMessage) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    source: contactSourceLabel(m.source),
    context: m.context,
    preview:
      m.message.length > 160 ? `${m.message.slice(0, 157)}…` : m.message,
    message: m.message,
    sessionId: m.sessionId,
    createdAt: m.createdAt,
  };
}

async function assertProjectSession(
  studioId: string,
  projectId: string,
  sessionId: string | undefined,
) {
  const project = await getProjectById(projectId);
  if (!project || project.studioId !== studioId) {
    return { ok: false as const, status: 404 as const, error: "Not found" };
  }
  if (!sessionId) {
    return { ok: true as const, project };
  }
  const session = await getSessionById(sessionId);
  const owner =
    session?.projectId ||
    (session as { clientId?: string } | null)?.clientId;
  if (!session || session.studioId !== studioId || owner !== projectId) {
    return { ok: false as const, status: 404 as const, error: "Not found" };
  }
  return { ok: true as const, project, sessionId };
}

/** Linked contact / inbound messages for a project (AURA-373). No full-studio RMW. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: projectId } = await ctx.params;
  const sessionId =
    new URL(req.url).searchParams.get("sessionId")?.trim() || undefined;
  const gate = await assertProjectSession(
    admin.studioId,
    projectId,
    sessionId,
  );
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const rows = await listContactMessagesForProject(admin.studioId, projectId, {
    sessionId,
    limit: 40,
  });

  return NextResponse.json({ messages: rows.map(mapMessage) });
}

/** One-shot Reply via Aura (AURA-374) — Resend send, Reply-To = project inbound. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: projectId } = await ctx.params;

  const rl = rateLimit(`project-reply:${admin.studioId}`, 30, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many replies — try again later" },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const to = stripContactHtml(String(b.to || ""))
    .toLowerCase()
    .slice(0, 254);
  const message = stripContactMessage(String(b.message || "")).slice(0, 4000);
  const clientName = stripContactHtml(String(b.clientName || "")).slice(0, 120);
  const sessionId = String(b.sessionId || "").trim().slice(0, 80) || undefined;

  if (!to.includes("@")) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const gate = await assertProjectSession(
    admin.studioId,
    projectId,
    sessionId,
  );
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const studio = await getStudioDoc(admin.studioId);
  if (!studio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const outboundId = nanoid();
  const delivered = await emailProjectClientReply({
    studio,
    to,
    clientName: clientName || gate.project.name,
    body: message,
    projectId,
    sessionId,
    idempotencyKey: `project-reply/${admin.studioId}/${outboundId}`,
  });

  if (!delivered.ok) {
    return NextResponse.json(
      {
        error: delivered.skipped
          ? "Email unavailable"
          : delivered.error || "Send failed",
      },
      { status: delivered.skipped ? 503 : 502 },
    );
  }

  const now = new Date().toISOString();
  const stored: ContactMessage = {
    id: outboundId,
    studioId: admin.studioId,
    source: "other",
    name: studio.name || "Studio",
    email: to,
    message,
    context: "Sent reply",
    projectId,
    ...(sessionId ? { sessionId } : {}),
    emailStatus: "sent",
    createdAt: now,
  };
  await appendStudioDoc(COL.contactMessages, stored);

  return NextResponse.json({ ok: true, message: mapMessage(stored) });
}
