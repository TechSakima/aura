import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import type { DateFormat, FontPresetId, StudioHomepageSettings } from "@/lib/types";

function studioForClient(studio: Awaited<ReturnType<typeof readStudioDb>>["studio"]) {
  const homepage = studio.homepage
    ? {
        ...studio.homepage,
        passwordHash: undefined,
        hasPassword: Boolean(studio.homepage.passwordHash),
      }
    : undefined;
  return { ...studio, homepage };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    studio: studioForClient(db.studio),
    watermarkPresets: db.watermarkPresets,
  });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let homepagePasswordHash: string | undefined | null = undefined;
  if (body.homepage && typeof body.homepage === "object") {
    if (typeof body.homepage.password === "string" && body.homepage.password.length > 0) {
      const bcrypt = await import("bcryptjs");
      homepagePasswordHash = await bcrypt.hash(body.homepage.password, 10);
    } else if (body.homepage.clearPassword === true) {
      homepagePasswordHash = null;
    }
  }

  await updateStudioDb(admin.studioId, (db) => {
    const s = db.studio;
    if (typeof body.name === "string") s.name = body.name;
    if (typeof body.brandTagline === "string") s.brandTagline = body.brandTagline;
    if (typeof body.logoUrl === "string") s.logoUrl = body.logoUrl;
    if (typeof body.coverLogoUrl === "string") s.coverLogoUrl = body.coverLogoUrl;
    if (typeof body.defaultCoverImageUrl === "string") {
      s.defaultCoverImageUrl = body.defaultCoverImageUrl;
    }
    if (typeof body.defaultWatermarkPresetId === "string") {
      s.defaultWatermarkPresetId = body.defaultWatermarkPresetId;
    }
    if (Array.isArray(body.printPartners)) s.printPartners = body.printPartners;
    if (typeof body.ownerFirstName === "string") s.ownerFirstName = body.ownerFirstName;
    if (typeof body.ownerLastName === "string") s.ownerLastName = body.ownerLastName;
    if (typeof body.website === "string") s.website = body.website;
    if (typeof body.phone === "string") s.phone = body.phone;
    if (typeof body.addressLine1 === "string") s.addressLine1 = body.addressLine1;
    if (typeof body.city === "string") s.city = body.city;
    if (typeof body.region === "string") s.region = body.region;
    if (typeof body.postalCode === "string") s.postalCode = body.postalCode;
    if (typeof body.country === "string") s.country = body.country;
    if (typeof body.timeZone === "string") s.timeZone = body.timeZone;
    if (typeof body.dateFormat === "string") {
      s.dateFormat = body.dateFormat as DateFormat;
    }
    if (body.theme && typeof body.theme === "object") {
      s.theme = {
        background: String(body.theme.background || s.theme?.background || "#F3F3F3"),
        accent: String(body.theme.accent || s.theme?.accent || "#1D1D1D"),
        fontPreset: (body.theme.fontPreset ||
          s.theme?.fontPreset ||
          "sans") as FontPresetId,
      };
    }
    if (body.homepage && typeof body.homepage === "object") {
      const prev = s.homepage!;
      const {
        password: _pw,
        clearPassword: _clear,
        passwordHash: _hash,
        hasPassword: _has,
        ...rest
      } = body.homepage as Record<string, unknown>;
      s.homepage = {
        ...prev,
        ...rest,
      } as StudioHomepageSettings;
      if (homepagePasswordHash === null) {
        delete s.homepage.passwordHash;
      } else if (typeof homepagePasswordHash === "string") {
        s.homepage.passwordHash = homepagePasswordHash;
      }
    }
    if (body.notificationPrefs && typeof body.notificationPrefs === "object") {
      s.notificationPrefs = {
        ...s.notificationPrefs,
        ...body.notificationPrefs,
      };
    }
    if (typeof body.googleCalendarConnected === "boolean") {
      s.googleCalendarConnected = body.googleCalendarConnected;
    }
  });

  return NextResponse.json({ ok: true });
}
