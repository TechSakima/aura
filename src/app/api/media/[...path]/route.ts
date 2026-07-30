import { NextResponse } from "next/server";
import { firebaseReady } from "@/lib/db/require-firebase";
import {
  isProductionMediaRuntime,
  mediaDualReadEnabled,
} from "@/lib/storage/media-store";
import { isR2Configured } from "@/lib/storage/r2-store";
import {
  downloadStorageBuffer,
  getSignedMediaDownloadUrl,
} from "@/lib/storage/upload";

const PROXY_SIGNED_TTL_SEC = 60 * 60;

/**
 * Legacy media proxy (AURA-362 / AURA-106).
 * When R2 is configured: 302 → short-lived signed R2 GET (not secrecy-of-URL).
 * Originals stay forbidden — PIN download API only.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const objectPath = parts.map(decodeURIComponent).join("/");

  if (objectPath.includes("/originals/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!objectPath.startsWith("studios/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (isR2Configured()) {
    try {
      const url = await getSignedMediaDownloadUrl(objectPath, {
        expiresInSec: PROXY_SIGNED_TTL_SEC,
      });
      return NextResponse.redirect(url, 302);
    } catch {
      if (!mediaDualReadEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      // Fall through to buffer dual-read for leftover Firebase-only objects.
    }
  } else if (isProductionMediaRuntime()) {
    return NextResponse.json(
      { error: "Media backend not configured" },
      { status: 503 },
    );
  }

  if (!firebaseReady()) {
    return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
  }

  try {
    const data = await downloadStorageBuffer(objectPath);
    const lower = objectPath.toLowerCase();
    let type = "application/octet-stream";
    if (data[0] === 0xff && data[1] === 0xd8) type = "image/jpeg";
    else if (data[0] === 0x89 && data[1] === 0x50) type = "image/png";
    else if (
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP"
    ) {
      type = "image/webp";
    } else if (lower.endsWith(".webp")) type = "image/webp";
    else if (lower.endsWith(".png")) type = "image/png";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) type = "image/jpeg";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
