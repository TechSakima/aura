import { NextResponse } from "next/server";
import { downloadStorageBuffer } from "@/lib/storage/upload";
import { firebaseReady } from "@/lib/db/require-firebase";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!firebaseReady()) {
    return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
  }

  const { path: parts } = await ctx.params;
  const objectPath = parts.map(decodeURIComponent).join("/");

  // Block public access to originals — PIN-gated download API only
  if (objectPath.includes("/originals/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!objectPath.startsWith("studios/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await downloadStorageBuffer(objectPath);
    const lower = objectPath.toLowerCase();
    const type = lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
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
