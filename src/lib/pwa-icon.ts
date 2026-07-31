import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { listStudiosWithPaymentLink } from "@/lib/db/payments";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import {
  findContractByToken,
  findGalleryByPublicToken,
  findProposalByToken,
  findQuestionnaireResponseByToken,
  findStudioIdByProjectCancelToken,
  getStudioDoc,
} from "@/lib/db/store";
import {
  publicStudioTheme,
  resolveGalleryBrandColors,
} from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { objectPathFromMediaUrl, resolveMediaUrl } from "@/lib/media-url";
import { downloadStorageBuffer } from "@/lib/storage/upload";
import { studioPwaBrand, studioPwaIconMediaUrl } from "@/lib/studio-pwa-manifest";

type SharpFn = typeof import("sharp");

let sharpLoadAttempted = false;
let sharpCached: SharpFn | null = null;

async function tryLoadSharp(): Promise<SharpFn | null> {
  if (sharpLoadAttempted) return sharpCached;
  sharpLoadAttempted = true;
  try {
    const mod = await import("sharp");
    const sharp = (("default" in mod ? mod.default : mod) ||
      mod) as SharpFn;
    await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();
    sharpCached = sharp;
    return sharpCached;
  } catch {
    sharpCached = null;
    return null;
  }
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  if (h.length >= 6) {
    return {
      r: Number.parseInt(h.slice(0, 2), 16) || 0,
      g: Number.parseInt(h.slice(2, 4), 16) || 0,
      b: Number.parseInt(h.slice(4, 6), 16) || 0,
    };
  }
  return { r: 28, g: 25, b: 21 };
}

async function loadMediaBuffer(mediaUrl: string): Promise<Buffer | null> {
  const objectPath =
    objectPathFromMediaUrl(mediaUrl) ||
    objectPathFromMediaUrl(resolveMediaUrl(mediaUrl));
  if (objectPath && !objectPath.includes("/originals/")) {
    try {
      return await downloadStorageBuffer(objectPath);
    } catch {
      /* fall through */
    }
  }
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    try {
      const res = await fetch(mediaUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  return null;
}

async function readStaticIcon(
  size: 192 | 512,
  purpose: "any" | "maskable",
): Promise<Buffer> {
  const file =
    purpose === "maskable"
      ? "icon-512-maskable.png"
      : size === 192
        ? "icon-192.png"
        : "icon-512.png";
  return fs.readFile(path.join(process.cwd(), "public", file));
}

/** Render square PNG — maskable keeps ~80% safe zone (AURA-289). */
export async function renderPwaIconPng(opts: {
  source: Buffer | null;
  size: 192 | 512;
  purpose: "any" | "maskable";
  background: string;
}): Promise<Buffer> {
  const sharp = await tryLoadSharp();
  if (!sharp || !opts.source) {
    return readStaticIcon(opts.size, opts.purpose);
  }

  const size = opts.size;
  const bg = parseHexColor(opts.background);

  try {
    if (opts.purpose === "maskable") {
      const inner = Math.round(size * 0.8);
      const pad = Math.round((size - inner) / 2);
      const logo = await sharp(opts.source)
        .resize(inner, inner, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      return sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: bg,
        },
      })
        .composite([{ input: logo, left: pad, top: pad }])
        .png()
        .toBuffer();
    }

    return sharp(opts.source)
      .resize(size, size, {
        fit: "contain",
        background: { ...bg, alpha: 1 },
      })
      .png()
      .toBuffer();
  } catch {
    return readStaticIcon(opts.size, opts.purpose);
  }
}

export type PwaIconResolve =
  | { source: Buffer | null; background: string }
  | { error: string; status: number };

async function resolveStudioIcon(
  studio: Awaited<ReturnType<typeof getStudioDoc>>,
): Promise<PwaIconResolve> {
  if (!studio) return { error: "Not found", status: 404 };
  const brand = studioPwaBrand(studio);
  const media = studioPwaIconMediaUrl(studio);
  const source = media ? await loadMediaBuffer(media) : null;
  return { source, background: brand.backgroundColor };
}

/** Resolve studio/gallery mark bytes for `/api/pwa-icon` (AURA-289 / 299 / 400). */
export async function resolvePwaIconSource(opts: {
  token?: string;
  slug?: string;
  /** Public studio id — admin install icons without session cookie (AURA-400). */
  studio?: string;
  surface?: string;
  proposal?: string;
  contract?: string;
  pay?: string;
  questionnaire?: string;
  cancel?: string;
}): Promise<PwaIconResolve> {
  if (opts.studio) {
    return resolveStudioIcon(await getStudioDoc(opts.studio));
  }

  // Legacy admin query: OS install often omits cookies — never 401 (AURA-400).
  if (opts.surface === "admin") {
    const admin = await requireAdmin();
    if (!admin) {
      return { source: null, background: "#1c1915" };
    }
    return resolveStudioIcon(admin.studio);
  }

  if (opts.proposal) {
    const hit = await findProposalByToken(opts.proposal);
    if (!hit?.studioId) return { error: "Not found", status: 404 };
    return resolveStudioIcon(await getStudioDoc(hit.studioId));
  }

  if (opts.contract) {
    const hit = await findContractByToken(opts.contract);
    if (!hit?.studioId) return { error: "Not found", status: 404 };
    return resolveStudioIcon(await getStudioDoc(hit.studioId));
  }

  if (opts.pay) {
    const hit = await listStudiosWithPaymentLink(opts.pay);
    if (!hit) return { error: "Not found", status: 404 };
    return resolveStudioIcon(await getStudioDoc(hit.studioId));
  }

  if (opts.questionnaire) {
    const hit = await findQuestionnaireResponseByToken(opts.questionnaire);
    if (!hit?.studioId) return { error: "Not found", status: 404 };
    return resolveStudioIcon(await getStudioDoc(hit.studioId));
  }

  if (opts.cancel) {
    const studioId = await findStudioIdByProjectCancelToken(opts.cancel);
    if (!studioId) return { error: "Not found", status: 404 };
    return resolveStudioIcon(await getStudioDoc(studioId));
  }

  if (opts.token) {
    const gallery = await findGalleryByPublicToken(opts.token);
    if (!gallery?.studioId) {
      return { error: "Not found", status: 404 };
    }
    const design = normalizeGalleryDesign(gallery.design);
    const studio = await getStudioDoc(gallery.studioId);
    const studioTheme = studio ? publicStudioTheme(studio) : null;
    const colors = resolveGalleryBrandColors(design, studioTheme);
    const media =
      design.appIconUrl ||
      (studio ? studioPwaIconMediaUrl(studio) : undefined) ||
      gallery.coverPhotoUrl;
    const source = media ? await loadMediaBuffer(media) : null;
    return { source, background: colors.backgroundColor };
  }

  if (opts.slug) {
    const studio = await findStudioByHomepageSlug(opts.slug);
    if (!studio?.homepage?.enabled) {
      return { error: "Not found", status: 404 };
    }
    return resolveStudioIcon(studio);
  }

  return { source: null, background: "#1c1915" };
}
