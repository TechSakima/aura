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
