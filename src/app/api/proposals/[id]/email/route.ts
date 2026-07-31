import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency";
import { emailQuoteShared } from "@/lib/notify/send";
import {
  hasProjectEmail,
  PROJECT_EMAIL_REQUIRED,
  projectEmail,
} from "@/lib/project-contact";

/** Email the public quote link to the project contact. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const idempotencyKey = readIdempotencyKey(req);

  return withIdempotency(
    idempotencyKey,
    `quote-email/${admin.studioId}/${id}`,
    async () => {
      const db = await readStudioDb(admin.studioId);
      const proposal = db.proposals.find((p) => p.id === id);
      if (!proposal) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const session = db.sessions.find(
        (s) => s.id === (proposal.sessionId || proposal.shootId),
      );
      const project =
        db.projects.find((p) => p.id === proposal.projectId) ||
        (session ? db.projects.find((p) => p.id === session.projectId) : null);
      if (!project || !hasProjectEmail(project)) {
        return NextResponse.json(
          { error: PROJECT_EMAIL_REQUIRED },
          { status: 400 },
        );
      }

      const result = await emailQuoteShared({
        studioId: admin.studioId,
        to: projectEmail(project),
        clientName: project.name,
        quoteTitle: proposal.title,
        token: proposal.token,
        projectId: project.id,
        sessionId: session?.id,
      });

      if (proposal.status === "draft") {
        await updateStudioDb(admin.studioId, (d) => {
          const p = d.proposals.find((x) => x.id === id);
          if (p) {
            p.status = "sent";
            p.updatedAt = new Date().toISOString();
          }
        });
      }

      if (!result.ok && "skipped" in result && result.skipped) {
        return NextResponse.json({
          ok: true,
          emailed: false,
          reason: "prefs_or_missing_key",
        });
      }
      if (!result.ok) {
        return NextResponse.json(
          { error: "error" in result ? result.error : "Send failed" },
          { status: 502 },
        );
      }

      return NextResponse.json({ ok: true, emailed: true });
    },
  );
}
