import { promises as fs } from "fs";
import path from "path";
import { TMP_DIR, TMP_WATERMARKS_DIR } from "@/lib/db/path";
import {
  downloadStorageBuffer,
  storageObjectPath,
  uploadBuffer,
} from "@/lib/storage/upload";
import type { WatermarkPreset } from "@/lib/types";

type SharpFn = typeof import("sharp").default;

async function loadSharp(): Promise<SharpFn> {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Image engine unavailable (${detail})`);
  }
}

export type ProcessedImage = {
  storagePath: string;
  thumbUrl: string;
  webUrl: string;
  watermarkedUrl: string;
  width: number;
  height: number;
  aspect: number;
};

function svgTextMark(text: string, imageMinSide: number, opacity: number) {
  // Corner mark ~2.6% of the short side — readable, not dominant.
  const fontSize = Math.max(14, Math.round(imageMinSide * 0.026));
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const width = Math.ceil(escaped.length * fontSize * 0.62) + 8;
  const height = Math.ceil(fontSize * 1.35) + 4;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wm {
          fill: white;
          font-size: ${fontSize}px;
          font-family: Georgia, "Times New Roman", serif;
          opacity: ${opacity};
        }
      </style>
      <text x="0" y="${Math.round(fontSize)}" class="wm">${escaped}</text>
    </svg>
  `);
}

async function padMarkForInset(mark: Buffer, inset = 20): Promise<Buffer> {
  const sharp = await loadSharp();
  return sharp(mark)
    .ensureAlpha()
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
}

async function applyWatermarkComposite(
  webBuf: Buffer,
  watermark: WatermarkPreset,
): Promise<Buffer> {
  const sharp = await loadSharp();
  const meta = await sharp(webBuf).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const gravity = positionGravity(watermark.position || "bottom-right");

  if (watermark.mode === "text" && watermark.text) {
    const overlay = await padMarkForInset(
      svgTextMark(watermark.text, Math.min(w, h), watermark.opacity),
    );
    return sharp(webBuf)
      .composite([{ input: overlay, gravity }])
      .webp({ quality: 82 })
      .toBuffer();
  }

  if (watermark.mode === "image") {
    const mark = await loadWatermarkMark(watermark, w).catch(() => null);
    if (mark) {
      const padded = await padMarkForInset(mark);
      return sharp(webBuf)
        .composite([{ input: padded, gravity }])
        .webp({ quality: 82 })
        .toBuffer();
    }
  }

  return sharp(webBuf).webp({ quality: 82 }).toBuffer();
}

function positionGravity(position: WatermarkPreset["position"]) {
  switch (position) {
    case "top-left":
      return "northwest";
    case "top-right":
      return "northeast";
    case "bottom-left":
      return "southwest";
    case "bottom-right":
      return "southeast";
    default:
      return "center";
  }
}

async function loadWatermarkMark(
  watermark: WatermarkPreset,
  w: number,
): Promise<Buffer | null> {
  if (watermark.mode !== "image" || !watermark.imagePath) return null;
  const scale = watermark.scale ?? 0.14;
  let markBuf: Buffer;
  if (watermark.imagePath.startsWith("studios/")) {
    markBuf = await downloadStorageBuffer(watermark.imagePath);
  } else {
    const local = path.isAbsolute(watermark.imagePath)
      ? watermark.imagePath
      : path.join(TMP_WATERMARKS_DIR, path.basename(watermark.imagePath));
    markBuf = await fs.readFile(local);
  }
  const sharp = await loadSharp();
  return sharp(markBuf)
    .resize({ width: Math.round(w * scale) })
    .ensureAlpha(watermark.opacity)
    .toBuffer();
}

export async function processUpload(opts: {
  buffer: Buffer;
  baseName: string;
  studioId: string;
  galleryId?: string;
  folder?: "galleries" | "ideas" | "brand" | "moodboards" | "watermarks";
  watermark?: WatermarkPreset | null;
}): Promise<ProcessedImage> {
  const folder = opts.folder ?? "galleries";
  const gallerySegment = opts.galleryId ?? "shared";
  const studioId = opts.studioId || "shared";
  const id = opts.baseName;
  const sharp = await loadSharp();

  let width = 1;
  let height = 1;
  let originalBuf: Buffer;
  let thumbBuf: Buffer;
  let webBuf: Buffer;
  let wmBuf: Buffer;

  try {
    const meta = await sharp(opts.buffer).rotate().metadata();
    width = meta.width ?? 1;
    height = meta.height ?? 1;

    originalBuf = await sharp(opts.buffer)
      .rotate()
      .jpeg({ quality: 92 })
      .toBuffer();
    thumbBuf = await sharp(opts.buffer)
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    webBuf = await sharp(opts.buffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    wmBuf = opts.watermark
      ? await applyWatermarkComposite(webBuf, opts.watermark)
      : await sharp(webBuf).webp({ quality: 82 }).toBuffer();
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not process image: ${detail}`);
  }

  const base =
    folder === "galleries"
      ? storageObjectPath(studioId, "galleries", gallerySegment)
      : storageObjectPath(studioId, folder);

  const originalPath = `${base}/originals/${id}.jpg`;
  const thumbPath = `${base}/derivatives/${id}-thumb.webp`;
  const webPath = `${base}/derivatives/${id}-web.webp`;
  const wmPath = `${base}/derivatives/${id}-wm.webp`;

  // Private objects served via /api/media — avoids public ACL / token issues.
  const [original, thumb, web, wm] = await Promise.all([
    uploadBuffer({
      buffer: originalBuf,
      objectPath: originalPath,
      contentType: "image/jpeg",
      makePublic: false,
    }),
    uploadBuffer({
      buffer: thumbBuf,
      objectPath: thumbPath,
      contentType: "image/webp",
      makePublic: false,
    }),
    uploadBuffer({
      buffer: webBuf,
      objectPath: webPath,
      contentType: "image/webp",
      makePublic: false,
    }),
    uploadBuffer({
      buffer: wmBuf,
      objectPath: wmPath,
      contentType: "image/webp",
      makePublic: false,
    }),
  ]);

  return {
    storagePath: original.path,
    thumbUrl: thumb.url,
    webUrl: web.url,
    watermarkedUrl: wm.url,
    width,
    height,
    aspect: width / Math.max(height, 1),
  };
}

/**
 * Rebuild the watermarked derivative from the stored original
 * (or existing web derivative). Returns a new public URL (new download token).
 */
export async function reprocessWatermarkedDerivative(opts: {
  storagePath: string;
  watermark: WatermarkPreset | null;
}): Promise<{ watermarkedUrl: string }> {
  const sharp = await loadSharp();
  const webPath = opts.storagePath
    .replace("/originals/", "/derivatives/")
    .replace(/\.jpe?g$/i, "-web.webp");
  const wmPath = opts.storagePath
    .replace("/originals/", "/derivatives/")
    .replace(/\.jpe?g$/i, "-wm.webp");

  let webBuf: Buffer;
  try {
    webBuf = await downloadStorageBuffer(webPath);
  } catch {
    const original = await downloadStorageBuffer(opts.storagePath);
    webBuf = await sharp(original)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  }

  const wmBuf = opts.watermark
    ? await applyWatermarkComposite(webBuf, opts.watermark)
    : await sharp(webBuf).webp({ quality: 82 }).toBuffer();

  const uploaded = await uploadBuffer({
    buffer: wmBuf,
    objectPath: wmPath,
    contentType: "image/webp",
    makePublic: false,
  });

  return { watermarkedUrl: uploaded.url };
}

export async function saveWatermarkAsset(
  buffer: Buffer,
  filename: string,
  studioId: string,
): Promise<string> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = storageObjectPath(studioId, "watermarks", safe);
  await uploadBuffer({
    buffer,
    objectPath,
    contentType: "image/png",
    makePublic: false,
  });
  return objectPath;
}

export async function saveBrandLogo(
  buffer: Buffer,
  studioId: string,
): Promise<string> {
  let out: Buffer;
  let contentType = "image/webp";
  let ext = "webp";
  try {
    const sharp = await loadSharp();
    out = await sharp(buffer)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    // Sharp can fail on some App Hosting images; store original bytes instead.
    out = buffer;
    contentType = "application/octet-stream";
    ext = "bin";
  }
  const objectPath = storageObjectPath(
    studioId,
    "brand",
    `logo-${Date.now()}.${ext}`,
  );
  const uploaded = await uploadBuffer({
    buffer: out,
    objectPath,
    contentType,
    makePublic: false,
  });
  return uploaded.url;
}

/** Ensure temp dir exists for rare local scratch (not durable). */
export async function ensureTmp() {
  await fs.mkdir(TMP_DIR, { recursive: true });
}
