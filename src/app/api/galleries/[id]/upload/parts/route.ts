import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { presignR2UploadPart } from "@/lib/storage/r2-upload";
import { isR2Configured } from "@/lib/storage/r2-store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PARTS_PER_REQUEST = 200;

/** POST — presign multipart part URLs. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Direct upload requires Cloudflare R2 (R2_*)." },
      { status: 503 },
    );
  }

  await ctx.params;
  const body = await req.json().catch(() => null);
  const objectPath = String(body?.objectPath || "");
  const uploadId = String(body?.uploadId || "");
  const partNumbers: number[] = Array.isArray(body?.partNumbers)
    ? body.partNumbers.map((n: unknown) => Number(n)).filter((n: number) => n >= 1 && n <= 10_000)
    : [];

  if (!objectPath.startsWith(`studios/${admin.studioId}/`)) {
    return NextResponse.json({ error: "Invalid objectPath" }, { status: 400 });
  }
  if (!uploadId) {
    return NextResponse.json({ error: "uploadId required" }, { status: 400 });
  }
  if (!partNumbers.length || partNumbers.length > MAX_PARTS_PER_REQUEST) {
    return NextResponse.json(
      { error: `partNumbers required (1–${MAX_PARTS_PER_REQUEST})` },
      { status: 400 },
    );
  }

  const parts = await Promise.all(
    partNumbers.map(async (partNumber) => ({
      partNumber,
      url: await presignR2UploadPart({ objectPath, uploadId, partNumber }),
    })),
  );

  return NextResponse.json({ parts });
}
