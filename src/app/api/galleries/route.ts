import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import {
  parseAdminListPage,
  slicePage,
} from "@/lib/admin-list-page";
import { projectOrSessionDeliveryHref } from "@/lib/admin-deep-links";
import {
  galleryExpiryFromNow,
  studioDeliveryDefaults,
} from "@/lib/delivery-defaults";
import {
  listGalleriesForStudio,
  listProjectsForStudio,
  readStudioDb,
  updateStudioDb,
} from "@/lib/db/store";
import {
  designFromPreset,
  normalizeGalleryDesign,
} from "@/lib/gallery-design";
import { hashPin, PinValidationError } from "@/lib/pin";
import { publicToken } from "@/lib/tokens";
import type { Gallery, GalleryStatus } from "@/lib/types";

function effectiveGalleryStatus(g: Gallery): GalleryStatus {
  if (g.status === "archived" || g.status === "draft") return g.status;
  if (g.status === "expired") return "expired";
  const exp = new Date(g.expiresAt).getTime();
  if (Number.isFinite(exp) && exp <= Date.now()) return "expired";
  return g.status === "live" ? "live" : g.status;
}

/**
 * Gallery list (AURA-064).
 * `options=1` — slim rows for Settings. Default — paginated admin index.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const galleries = await listGalleriesForStudio(admin.studioId);

  if (url.searchParams.get("options") === "1") {
    const rows = galleries
      .map(({ downloadPinHash: _, ...g }) => g)
      .sort((a, b) =>
        (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
      );
    return NextResponse.json({ galleries: rows });
  }

  const { offset, limit } = parseAdminListPage(url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const statusFilter = (url.searchParams.get("status") || "all").toLowerCase();
  const projects = await listProjectsForStudio(admin.studioId);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  let filtered = galleries.map((g) => {
    const status = effectiveGalleryStatus(g);
    const sessionId = g.sessionId || g.shootId;
    const projectId = g.projectId || "";
    return {
      id: g.id,
      title: g.title,
      status,
      expiresAt: g.expiresAt,
      liveAt: g.liveAt,
      projectId: projectId || undefined,
      sessionId: sessionId || undefined,
      projectName: projectId ? projectName.get(projectId) || "Project" : undefined,
      publicToken: g.publicToken,
      adminHref: projectOrSessionDeliveryHref({
        projectId,
        sessionId,
        fallback: "/admin/projects",
      }),
      updatedAt: g.updatedAt,
      createdAt: g.createdAt,
    };
  });

  if (statusFilter !== "all") {
    filtered = filtered.filter((g) => g.status === statusFilter);
  }
  if (q) {
    filtered = filtered.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.projectName || "").toLowerCase().includes(q),
    );
  }
  filtered = filtered.sort((a, b) => {
    const aExp = a.expiresAt || "";
    const bExp = b.expiresAt || "";
    if (aExp && bExp && aExp !== bExp) return aExp.localeCompare(bExp);
    return (b.updatedAt || b.createdAt).localeCompare(
      a.updatedAt || a.createdAt,
    );
  });

  const page = slicePage(filtered, offset, limit);
  return NextResponse.json({
    galleries: page.items,
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
