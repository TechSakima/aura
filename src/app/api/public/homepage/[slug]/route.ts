import { NextResponse } from "next/server";
import { findStudioByHomepageSlug } from "@/lib/db/homepage-slug";
import {
  listGalleriesForStudio,
  listSessionTypesForStudio,
} from "@/lib/db/store";
import {
  createHomepageUnlockToken,
  homepageUnlockCookieHeader,
  isHomepageUnlocked,
} from "@/lib/homepage-unlock";
import { buildHomepagePayload } from "@/lib/homepage-payload";
import { resolveBrowseMediaUrl } from "@/lib/media-url-server";
import { rateLimit } from "@/lib/rate-limit";

async function buildGate(studio: {
  name: string;
  logoUrl?: string;
  theme?: { background?: string; accent?: string; fontPreset?: string; presetId?: string };
}) {
  return {
    name: studio.name,
    logoUrl: (await resolveBrowseMediaUrl(studio.logoUrl)) || undefined,
    theme: studio.theme,
  };
}

async function homepageJson(studio: NonNullable<
  Awaited<ReturnType<typeof findStudioByHomepageSlug>>
>) {
  const [galleries, sessionTypes] = await Promise.all([
    listGalleriesForStudio(studio.id),
    listSessionTypesForStudio(studio.id),
  ]);
  return buildHomepagePayload(studio, galleries, sessionTypes);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioByHomepageSlug(slug);
  if (!studio?.homepage?.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const passwordHash = studio.homepage.passwordHash;
  if (passwordHash) {
    const unlocked = isHomepageUnlocked({
      cookieHeader: req.headers.get("cookie"),
      slug: studio.homepage.slug || slug,
      passwordHash,
    });
    if (!unlocked) {
      return NextResponse.json(
        {
          error: "Password required",
          needsPassword: true,
          gate: await buildGate(studio),
        },
        { status: 401 },
      );
    }
  }

  return NextResponse.json(await homepageJson(studio));
}

/** Verify homepage password; set unlock cookie; return payload (AURA-039 / AURA-234). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const studio = await findStudioByHomepageSlug(slug);
  if (!studio?.homepage?.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const passwordHash = studio.homepage.passwordHash;
  if (!passwordHash) {
    return NextResponse.json(await homepageJson(studio));
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`homepage-pw:${slug}:${ip}`, 12, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  const bcrypt = await import("bcryptjs");
  const ok = await bcrypt.compare(password, passwordHash);
  if (!ok) {
    return NextResponse.json(
      {
        error: "Wrong password",
        needsPassword: true,
        gate: await buildGate(studio),
      },
      { status: 401 },
    );
  }

  const siteSlug = studio.homepage.slug || slug;
  const token = createHomepageUnlockToken(siteSlug, passwordHash);
  const payload = await homepageJson(studio);
  const res = NextResponse.json(payload);
  res.headers.append("Set-Cookie", homepageUnlockCookieHeader(token));
  return res;
}
