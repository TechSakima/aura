import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { COL } from "@/lib/db/collections";
import {
  getGalleryBundle,
  updateStudioDb,
  updateStudioDoc,
} from "@/lib/db/store";
import { markGalleryLive } from "@/lib/gallery-live";
import { applyGalleryDesignPatch } from "@/lib/gallery-design";
import { enqueueWatermarkReprocess } from "@/lib/jobs/watermark-reprocess";
import {
  resolveBrowseMediaUrl,
  resolvePhotoBrowseFields,
} from "@/lib/media-url-server";
import { notifyStudio } from "@/lib/notify/send";
import { hashPin, PinValidationError } from "@/lib/pin";
import type { Gallery } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const bundle = await getGalleryBundle(id);
  if (!bundle || bundle.gallery.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { downloadPinHash: _, ...gallery } = bundle.gallery;
  const [coverPhotoUrl, photos] = await Promise.all([
    resolveBrowseMediaUrl(gallery.coverPhotoUrl),
    Promise.all(bundle.photos.map((p) => resolvePhotoBrowseFields(p))),
  ]);
  return NextResponse.json({
    gallery: {
      ...gallery,
      ...(coverPhotoUrl !== undefined ? { coverPhotoUrl } : {}),
    },
    photos,
    shoot: bundle.shoot,
    client: bundle.client,
    watermarkPresets: bundle.watermarkPresets,
  });
}

/** Gallery-doc fields only — no goLive / watermark reprocess (AURA-243). */
async function applyGalleryDocPatch(
  g: Gallery,
  body: Record<string, unknown>,
): Promise<void> {
  if (body.title != null) g.title = String(body.title);
  if (body.commentsEnabled != null) {
    g.commentsEnabled = Boolean(body.commentsEnabled);
  }
  if (body.selectLimit != null) {
    g.selectLimit =
      body.selectLimit === "" || body.selectLimit === null
        ? undefined
        : Number(body.selectLimit);
  }
  if (body.coverPhotoUrl != null) {
    g.coverPhotoUrl = String(body.coverPhotoUrl);
  }
  if (body.showOnHomepage != null) {
    g.showOnHomepage = Boolean(body.showOnHomepage);
  }
  if (body.design && typeof body.design === "object") {
    g.design = applyGalleryDesignPatch(g.design, {
      ...(body.design as Record<string, unknown>),
      /* Colors come from curated themes — clear freeform overrides */
      background: undefined,
      accent: undefined,
    });
  }
  if (body.extendDays != null) {
    const base = new Date(g.expiresAt).getTime();
    g.expiresAt = new Date(
      base + Number(body.extendDays) * 24 * 60 * 60 * 1000,
    ).toISOString();
    if (g.status === "expired") g.status = "live";
  }
  if (body.expireEarly) {
    g.status = "expired";
    g.expiresAt = new Date().toISOString();
  }
  if (body.pin) {
    g.downloadPinHash = await hashPin(String(body.pin));
  }
  if (body.watermarkEnabled != null) {
    g.watermarkEnabled = Boolean(body.watermarkEnabled);
  }
  if (body.watermarkPresetId != null) {
    g.watermarkPresetId = (body.watermarkPresetId as string) || undefined;
  }
  g.updatedAt = new Date().toISOString();
}

function needsFullStudioRmw(body: Record<string, unknown>): boolean {
  return Boolean(body.goLive);
}

function watermarkFieldsChanged(
  before: Gallery,
  after: Gallery,
  body: Record<string, unknown>,
): boolean {
  if (body.watermarkEnabled != null && before.watermarkEnabled !== after.watermarkEnabled) {
    return true;
  }
  if (
    body.watermarkPresetId != null &&
    (before.watermarkPresetId || undefined) !== (after.watermarkPresetId || undefined)
  ) {
    return true;
  }
  return false;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;

  try {
    /* Design / cover / watermark settings: O(gallery) write (AURA-243 / AURA-387). */
    if (!needsFullStudioRmw(body)) {
      let before: Gallery | null = null;
      const gallery = await updateStudioDoc<Gallery>(
        COL.galleries,
        id,
        async (g) => {
          if (g.studioId !== admin.studioId) return null;
          before = { ...g };
          await applyGalleryDocPatch(g, body);
          return g;
        },
      );
      if (!gallery || gallery.studioId !== admin.studioId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      let watermarksQueued = false;
      if (before && watermarkFieldsChanged(before, gallery, body)) {
        await enqueueWatermarkReprocess({
          studioId: admin.studioId,
          galleryId: id,
        });
        watermarksQueued = true;
      }
      const { downloadPinHash: _, ...safe } = gallery;
      return NextResponse.json({
        gallery: safe,
        watermarksReprocessed: false,
        watermarksQueued,
      });
    }

    const gallery = await updateStudioDb(admin.studioId, async (db) => {
      const g = db.galleries.find((x) => x.id === id);
      if (!g) return null;
      await applyGalleryDocPatch(g, body);
      if (body.goLive) {
        return markGalleryLive(db, id);
      }
      g.updatedAt = new Date().toISOString();
      return g;
    });

    if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.goLive) {
      const { readStudioDb } = await import("@/lib/db/store");
      const { emailGalleryLive } = await import("@/lib/notify/send");
      const db = await readStudioDb(admin.studioId);
      const g = db.galleries.find((x) => x.id === id);
      if (g) {
        const project =
          db.projects.find((p) => p.id === g.projectId) ||
          (() => {
            const sid = g.sessionId || g.shootId;
            const session = sid
              ? db.sessions.find((s) => s.id === sid)
              : null;
            return session
              ? db.projects.find((p) => p.id === session.projectId)
              : null;
          })();
        if (project?.email) {
          await emailGalleryLive({
            studioId: admin.studioId,
            to: project.email,
            clientName: project.name,
            galleryTitle: g.title,
            publicToken: g.publicToken,
            projectId: project.id,
            sessionId: g.sessionId || g.shootId,
          });
        }
        const sessionId = g.sessionId || g.shootId;
        await notifyStudio({
          studioId: admin.studioId,
          type: "gallery_live",
          title: "Gallery live",
          body: g.title,
          href: project
            ? sessionId
              ? `/admin/projects/${project.id}/sessions/${sessionId}?step=delivery`
              : `/admin/projects/${project.id}#workflow`
            : `/g/${g.publicToken}`,
          emailStudio: false,
        });
        if (project) {
          const { updateStudioDb: updateDb } = await import("@/lib/db/store");
          await updateDb(admin.studioId, (d) => {
            const p = d.projects.find((x) => x.id === project.id);
            if (p) {
              p.stage = "delivered";
              p.workflowStep = "delivery";
              p.updatedAt = new Date().toISOString();
            }
          });
        }
      }
    }

    const { downloadPinHash: _, ...safe } = gallery;
    return NextResponse.json({
      gallery: safe,
      watermarksReprocessed: false,
      watermarksQueued: false,
    });
  } catch (e) {
    if (e instanceof PinValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
