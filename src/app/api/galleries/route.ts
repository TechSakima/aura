import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import {
  galleryExpiryFromNow,
  studioDeliveryDefaults,
} from "@/lib/delivery-defaults";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  designFromPreset,
  normalizeGalleryDesign,
} from "@/lib/gallery-design";
import { hashPin, PinValidationError } from "@/lib/pin";
import { publicToken } from "@/lib/tokens";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    galleries: db.galleries.map(({ downloadPinHash: _, ...g }) => g),
    shoots: db.sessions,
    clients: db.projects.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
    })),
    watermarkPresets: db.watermarkPresets,
    photoCounts: db.photos.reduce<Record<string, number>>((acc, p) => {
      acc[p.galleryId] = (acc[p.galleryId] || 0) + 1;
      return acc;
    }, {}),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const sessionId = String(body.sessionId || body.shootId || "");
  if (!sessionId || !body.title) {
    return NextResponse.json(
      { error: "sessionId and title are required" },
      { status: 400 },
    );
  }

  try {
    const db = await readStudioDb(admin.studioId);
    const defaults = studioDeliveryDefaults(db.studio);
    const pinRaw = body.pin != null ? String(body.pin).trim() : "";
    const pinRequired = defaults.downloadPinPolicy === "required";
    if (pinRequired && !pinRaw) {
      return NextResponse.json(
        { error: "A 4-digit download PIN is required" },
        { status: 400 },
      );
    }
    const pinHash = pinRaw ? await hashPin(pinRaw) : "";

    const now = new Date();
    const live = body.goLive !== false;
    const liveAt = live ? now.toISOString() : undefined;
    const expiresAt = galleryExpiryFromNow(defaults.expiryDays, now);

    const commentsEnabled =
      body.commentsEnabled != null
        ? Boolean(body.commentsEnabled)
        : defaults.commentsEnabled;
    const watermarkEnabled =
      body.watermarkEnabled != null
        ? body.watermarkEnabled !== false
        : defaults.watermarkEnabled;
    const watermarkPresetId =
      body.watermarkPresetId != null
        ? String(body.watermarkPresetId || "") || undefined
        : db.studio.defaultWatermarkPresetId;
    const selectLimit =
      body.selectLimit != null
        ? body.selectLimit === "" || body.selectLimit === null
          ? undefined
          : Number(body.selectLimit)
        : defaults.selectLimit;

    const gallery = {
      id: nanoid(),
      studioId: admin.studioId,
      projectId: "",
      sessionId,
      publicToken: publicToken(),
      title: String(body.title),
      downloadPinHash: pinHash,
      commentsEnabled,
      watermarkEnabled,
      watermarkPresetId,
      selectLimit,
      expiresAt,
      liveAt,
      status: live ? ("live" as const) : ("draft" as const),
      favoritePhotoIds: [] as string[],
      design: normalizeGalleryDesign({
        ...designFromPreset(defaults.themeId),
        coverStyle: defaults.coverStyle,
        gridMode: defaults.gridMode,
      }),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 400 });
    }
    gallery.projectId = session.projectId;

    await updateStudioDb(admin.studioId, (d) => {
      d.galleries.unshift(gallery);
      const linked = d.sessions.find((s) => s.id === sessionId);
      if (linked) {
        linked.galleryId = gallery.id;
        if (live) linked.status = "delivered";
        linked.updatedAt = now.toISOString();
      }
    });

    return NextResponse.json({
      gallery: {
        ...gallery,
        downloadPinHash: undefined,
        pin: pinRaw || undefined,
        hasDownloadPin: Boolean(pinHash),
      },
    });
  } catch (e) {
    if (e instanceof PinValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
