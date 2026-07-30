import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { applyBrandKitMirrors, ensureStudioBrandKit } from "@/lib/brand-kit";
import { COL } from "@/lib/db/collections";
import { updateStudioDoc } from "@/lib/db/store";
import type { Studio } from "@/lib/types";
import { saveBrandLogo, type BrandImageKind } from "@/lib/images/process";

function parseKind(raw: FormDataEntryValue | null): BrandImageKind {
  if (
    raw === "cover" ||
    raw === "og" ||
    raw === "mark" ||
    raw === "wordmark" ||
    raw === "lockup"
  ) {
    return raw;
  }
  return "logo";
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (typeof file === "string" || !file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const kind = parseKind(form.get("kind"));
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "empty file" }, { status: 400 });
    }

    const url = await saveBrandLogo(buffer, admin.studioId, kind);
    let response: Record<string, string> = { logoUrl: url };

    await updateStudioDoc<Studio>(COL.studios, admin.studioId, (s) => {
      const kit = ensureStudioBrandKit(s);
      if (kind === "cover") {
        kit.logos.invertedUrl = url;
        response = { coverLogoUrl: url, invertedUrl: url };
      } else if (kind === "og") {
        kit.coverImageUrl = url;
        response = { defaultCoverImageUrl: url, coverImageUrl: url };
      } else if (kind === "mark") {
        kit.logos.markUrl = url;
        response = { markUrl: url, logoUrl: kit.logos.lockupUrl || url };
      } else if (kind === "wordmark") {
        kit.logos.wordmarkUrl = url;
        response = {
          wordmarkUrl: url,
          logoUrl: kit.logos.lockupUrl || kit.logos.markUrl || url,
        };
      } else {
        /* logo | lockup */
        kit.logos.lockupUrl = url;
        response = { logoUrl: url, lockupUrl: url };
      }
      applyBrandKitMirrors(s, kit);
      s.updatedAt = new Date().toISOString();
      return s;
    });

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Logo upload failed";
    console.error("[studio/logo]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
