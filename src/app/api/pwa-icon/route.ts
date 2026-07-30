import { NextResponse } from "next/server";
import { renderPwaIconPng, resolvePwaIconSource } from "@/lib/pwa-icon";

/**
 * Same-origin PNG icons for Web App Manifests (AURA-289 / 299).
 * Query: size=192|512, purpose=any|maskable, plus
 * token= | slug= | surface=admin | proposal= | contract= | pay=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeRaw = url.searchParams.get("size") || "512";
  const purposeRaw = url.searchParams.get("purpose") || "any";
  const size = sizeRaw === "192" ? 192 : 512;
  const purpose = purposeRaw === "maskable" ? "maskable" : "any";

  const resolved = await resolvePwaIconSource({
    token: url.searchParams.get("token") || undefined,
    slug: url.searchParams.get("slug") || undefined,
    surface: url.searchParams.get("surface") || undefined,
    proposal: url.searchParams.get("proposal") || undefined,
    contract: url.searchParams.get("contract") || undefined,
    pay: url.searchParams.get("pay") || undefined,
  });

  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const png = await renderPwaIconPng({
    source: resolved.source,
    size,
    purpose,
    background: resolved.background,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
