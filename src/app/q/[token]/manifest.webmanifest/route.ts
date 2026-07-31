import { NextResponse } from "next/server";
import { publicFlowPwaChrome } from "@/lib/public-flow-pwa";
import { buildWebManifest, webManifestResponse } from "@/lib/studio-pwa-manifest";

/** Lightweight questionnaire PWA — no service worker (AURA-418). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const chrome = await publicFlowPwaChrome("questionnaire", token);
  if (!chrome.studio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { body, headers } = webManifestResponse(
    buildWebManifest({
      id: chrome.path,
      name: chrome.title,
      shortName: chrome.brand.shortName,
      description: chrome.description,
      startUrl: chrome.path,
      scope: chrome.path,
      backgroundColor: chrome.brand.backgroundColor,
      themeColor: chrome.brand.themeColor,
      iconQuery: chrome.iconQuery,
      preferExistingWindow: true,
    }),
  );

  return NextResponse.json(body, { headers });
}
