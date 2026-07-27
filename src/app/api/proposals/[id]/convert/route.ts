import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import { hashPin, PinValidationError } from "@/lib/pin";
import { publicToken } from "@/lib/tokens";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const pin = String(body.pin || "");
  if (!pin) {
    return NextResponse.json(
      { error: "Choose a 4-digit download PIN" },
      { status: 400 },
    );
  }

  try {
    const pinHash = await hashPin(pin);
    const now = new Date();

    const gallery = await updateStudioDb(admin.studioId, (db) => {
      const proposal = db.proposals.find((p) => p.id === id);
      if (!proposal) return null;
      const sessionId = proposal.sessionId || proposal.shootId;
      const existing = db.galleries.find(
        (g) => (g.sessionId || g.shootId) === sessionId,
      );
      if (existing) return existing;

      const g = {
        id: nanoid(),
        studioId: admin.studioId,
        projectId: proposal.projectId,
        sessionId,
        shootId: sessionId,
        publicToken: publicToken(),
        title:
          proposal.title
            .replace(/Proposal|Quote/i, "Gallery")
            .trim() || proposal.title,
        downloadPinHash: pinHash,
        commentsEnabled: Boolean(body.commentsEnabled),
        watermarkEnabled: true,
        watermarkPresetId: db.studio.defaultWatermarkPresetId,
        expiresAt: new Date(
          now.getTime() + 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        liveAt: undefined,
        status: "draft" as const,
        favoritePhotoIds: [] as string[],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      db.galleries.unshift(g);
      const session = db.sessions.find(
        (s) => s.id === (proposal.sessionId || proposal.shootId),
      );
      if (session) {
        session.galleryId = g.id;
        session.updatedAt = now.toISOString();
      }
      return g;
    });

    if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      gallery: { ...gallery, downloadPinHash: undefined },
      pin,
      redirectTo: `/admin/galleries/${gallery.id}`,
    });
  } catch (e) {
    if (e instanceof PinValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
