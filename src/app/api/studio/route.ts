import { NextResponse } from "next/server";
import { logout, requireAdmin } from "@/lib/auth";
import { COL } from "@/lib/db/collections";
import { deleteStudioCascade } from "@/lib/db/delete-studio";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import {
  readStudioDb,
  updateStudioDoc,
} from "@/lib/db/store";
import { isDateFormat } from "@/lib/date-format";
import { normalizeBookingDefaults } from "@/lib/booking-defaults";
import { normalizeDeliveryDefaults } from "@/lib/delivery-defaults";
import { normalizeContactPrefs } from "@/lib/contact-prefs";
import { normalizeLegalDefaults } from "@/lib/legal-defaults";
import { normalizePaymentDefaults } from "@/lib/payment-defaults";
import {
  isSettingsWriteSection,
  NOTIFICATION_PREF_KEYS,
  SECTION_HOMEPAGE_KEYS,
  SECTION_TOP_LEVEL_KEYS,
  SETTINGS_WRITE_SECTIONS,
  type SettingsWriteSection,
} from "@/lib/settings/write-contracts";
import type {
  FontPresetId,
  Studio,
  StudioHomepageSettings,
} from "@/lib/types";
import { isValidIanaTimeZone } from "@/lib/timezones";
import {
  applyBrandKitMirrors,
  ensureStudioBrandKit,
  normalizeBrandKit,
} from "@/lib/brand-kit";
import {
  isHomepageSlugAvailable,
  normalizeHomepageSlug,
  syncHomepageSlugIndex,
} from "@/lib/db/homepage-slug";
import {
  applyHomepageTogglePatchToModules,
  ensureHomepageModules,
  normalizeHomepageModules,
  syncHomepageTogglesFromModules,
} from "@/lib/homepage-modules";
import {
  resolveStudioThemePreset,
  studioThemeFromPreset,
} from "@/lib/themes";
import { absoluteExternalUrl } from "@/lib/urls";

function studioForClient(studio: Studio) {
  const homepage = studio.homepage
    ? {
        ...studio.homepage,
        passwordHash: undefined,
        hasPassword: Boolean(studio.homepage.passwordHash),
      }
    : undefined;
  const { googleCalendarRefreshToken: _, ...rest } = studio;
  const ready = Boolean(studio.googleCalendarRefreshToken?.trim());
  return {
    ...rest,
    homepage,
    googleCalendarConnected: ready,
  };
}

function pickHomepagePatch(
  section: SettingsWriteSection,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = SECTION_HOMEPAGE_KEYS[section];
  if (!allowed) return {};
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in raw) out[key] = raw[key];
  }
  return out;
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
  const body = await req.json().catch(() => ({}));

  if (!isSettingsWriteSection(body.section)) {
    return NextResponse.json(
      { error: "section required", sections: SETTINGS_WRITE_SECTIONS },
      { status: 400 },
    );
  }
  const section = body.section as SettingsWriteSection;
  const allowed = new Set(SECTION_TOP_LEVEL_KEYS[section]);

  for (const key of Object.keys(body)) {
    if (key === "section") continue;
    if (!allowed.has(key)) {
      return NextResponse.json(
        { error: `Key “${key}” not allowed for section “${section}”` },
        { status: 400 },
      );
    }
  }

  let homepagePasswordHash: string | undefined | null = undefined;
  if (
    body.homepage &&
    typeof body.homepage === "object" &&
    section === "website"
  ) {
    const hp = body.homepage as Record<string, unknown>;
    if (typeof hp.password === "string" && hp.password.length > 0) {
      const bcrypt = await import("bcryptjs");
      homepagePasswordHash = await bcrypt.hash(hp.password, 10);
    } else if (hp.clearPassword === true) {
      homepagePasswordHash = null;
    }
  }

  if (section === "library" && body.legalDefaults) {
    const patch = body.legalDefaults as Record<string, unknown>;
    const templateId =
      patch.defaultContractTemplateId === null ||
      patch.defaultContractTemplateId === ""
        ? undefined
        : patch.defaultContractTemplateId != null
          ? String(patch.defaultContractTemplateId)
          : undefined;
    if (templateId) {
      const { db } = assertFirebaseReady();
      const snap = await db.collection(COL.contractTemplates).doc(templateId).get();
      const data = snap.data() as { studioId?: string } | undefined;
      if (!snap.exists || data?.studioId !== admin.studioId) {
        return NextResponse.json(
          { error: "Contract template not found" },
          { status: 400 },
        );
      }
    }
  }

  const previousSlug = admin.studio.homepage?.slug || "";
  let nextSlugForIndex: string | undefined;
  if (
    body.homepage &&
    typeof body.homepage === "object" &&
    typeof (body.homepage as { slug?: unknown }).slug === "string"
  ) {
    const candidate = normalizeHomepageSlug(
      String((body.homepage as { slug: string }).slug),
    );
    if (candidate && candidate !== normalizeHomepageSlug(previousSlug)) {
      const free = await isHomepageSlugAvailable(candidate, admin.studioId);
      if (!free) {
        return NextResponse.json(
          { error: "Site URL is taken" },
          { status: 409 },
        );
      }
    }
    nextSlugForIndex = candidate;
  }

  const updated = await updateStudioDoc<Studio>(
    COL.studios,
    admin.studioId,
    (s) => {
      if (section === "account") {
        if (typeof body.ownerFirstName === "string") {
          s.ownerFirstName = body.ownerFirstName;
        }
        if (typeof body.ownerLastName === "string") {
          s.ownerLastName = body.ownerLastName;
        }
      }

      if (section === "brand") {
        if (typeof body.name === "string") s.name = body.name;
        if (typeof body.brandTagline === "string") {
          s.brandTagline = body.brandTagline;
        }
        if (Array.isArray(body.socialLinks)) {
          s.socialLinks = body.socialLinks
            .map((row: { label?: string; url?: string }) => ({
              label: String(row?.label || "").trim(),
              url: absoluteExternalUrl(String(row?.url || "")) || "",
            }))
            .filter(
              (row: { label: string; url: string }) => row.label && row.url,
            );
        }

        let kit = ensureStudioBrandKit(s);

        if (body.brandKit && typeof body.brandKit === "object") {
          kit = normalizeBrandKit(body.brandKit as typeof kit, s);
        }

        if (body.theme && typeof body.theme === "object") {
          const preset = resolveStudioThemePreset(body.theme);
          const fontPreset = (body.theme.fontPreset ||
            kit.fonts.pairingId ||
            preset.fontPreset) as FontPresetId;
          const theme = studioThemeFromPreset(preset, fontPreset);
          s.theme = theme;
          kit = {
            ...kit,
            basePresetId: theme.presetId || preset.id,
            background: theme.background,
            accent: theme.accent,
            accentSecondary: preset.accentSecondary || preset.muted,
            fonts: { pairingId: theme.fontPreset },
          };
        }

        if (typeof body.logoUrl === "string") {
          const logo = body.logoUrl.trim();
          if (logo) kit.logos.lockupUrl = logo;
          else delete kit.logos.lockupUrl;
        }
        if (typeof body.coverLogoUrl === "string") {
          const coverLogo = body.coverLogoUrl.trim();
          if (coverLogo) kit.logos.invertedUrl = coverLogo;
          else delete kit.logos.invertedUrl;
        }
        if (typeof body.defaultCoverImageUrl === "string") {
          const cover = body.defaultCoverImageUrl.trim();
          if (cover) kit.coverImageUrl = cover;
          else delete kit.coverImageUrl;
        }

        applyBrandKitMirrors(s, kit);
      }

      if (section === "business") {
        if (Array.isArray(body.printPartners)) {
          s.printPartners = body.printPartners;
        }
        if (typeof body.website === "string") {
          s.website = absoluteExternalUrl(body.website) || body.website.trim();
        }
        if (typeof body.phone === "string") s.phone = body.phone;
        if (typeof body.addressLine1 === "string") {
          s.addressLine1 = body.addressLine1;
        }
        if (typeof body.addressLine2 === "string") {
          s.addressLine2 = body.addressLine2;
        }
        if (typeof body.city === "string") s.city = body.city;
        if (typeof body.region === "string") s.region = body.region;
        if (typeof body.postalCode === "string") {
          s.postalCode = body.postalCode;
        }
        if (typeof body.country === "string") s.country = body.country;
      }

      if (section === "studio") {
        if (
          typeof body.timeZone === "string" &&
          isValidIanaTimeZone(body.timeZone)
        ) {
          s.timeZone = body.timeZone.trim();
        }
        if (
          typeof body.dateFormat === "string" &&
          isDateFormat(body.dateFormat)
        ) {
          s.dateFormat = body.dateFormat;
        }
      }

      if (body.homepage && typeof body.homepage === "object") {
        const hpPatch = pickHomepagePatch(
          section,
          body.homepage as Record<string, unknown>,
        );
        if (Object.keys(hpPatch).length) {
          const {
            password: _pw,
            clearPassword: _clear,
            passwordHash: _hash,
            hasPassword: _has,
            modules: modulesPatch,
            ...rest
          } = hpPatch;
          s.homepage = {
            ...(s.homepage as StudioHomepageSettings),
            ...rest,
          } as StudioHomepageSettings;
          if (typeof s.homepage.slug === "string") {
            s.homepage.slug = normalizeHomepageSlug(s.homepage.slug);
          }
          if (section === "website") {
            if (homepagePasswordHash === null) {
              delete s.homepage.passwordHash;
            } else if (typeof homepagePasswordHash === "string") {
              s.homepage.passwordHash = homepagePasswordHash;
            }
          }
          if (modulesPatch !== undefined) {
            s.homepage.modules = normalizeHomepageModules(
              modulesPatch,
              s.homepage,
            );
            syncHomepageTogglesFromModules(s.homepage);
          } else {
            applyHomepageTogglePatchToModules(
              s.homepage,
              rest as Partial<StudioHomepageSettings>,
            );
            ensureHomepageModules(s.homepage);
          }
        }
      }

      if (
        section === "notifications" &&
        body.notificationPrefs &&
        typeof body.notificationPrefs === "object"
      ) {
        const raw = body.notificationPrefs as Record<string, unknown>;
        const next = { ...s.notificationPrefs };
        for (const key of NOTIFICATION_PREF_KEYS) {
          if (key in raw) {
            (next as Record<string, unknown>)[key] = Boolean(raw[key]);
          }
        }
        s.notificationPrefs = next;
      }

      if (
        section === "delivery" &&
        body.deliveryDefaults &&
        typeof body.deliveryDefaults === "object"
      ) {
        if (typeof body.defaultWatermarkPresetId === "string") {
          s.defaultWatermarkPresetId = body.defaultWatermarkPresetId;
        }
        const patch = body.deliveryDefaults as Record<string, unknown>;
        s.deliveryDefaults = normalizeDeliveryDefaults({
          ...s.deliveryDefaults,
          ...patch,
          selectLimit:
            patch.selectLimit === null
              ? undefined
              : patch.selectLimit !== undefined
                ? patch.selectLimit
                : s.deliveryDefaults?.selectLimit,
        });
      } else if (
        section === "delivery" &&
        typeof body.defaultWatermarkPresetId === "string"
      ) {
        s.defaultWatermarkPresetId = body.defaultWatermarkPresetId;
      }

      if (
        section === "booking" &&
        body.bookingDefaults &&
        typeof body.bookingDefaults === "object"
      ) {
        s.bookingDefaults = normalizeBookingDefaults({
          ...s.bookingDefaults,
          ...body.bookingDefaults,
        });
      }

      if (
        section === "payments" &&
        body.paymentDefaults &&
        typeof body.paymentDefaults === "object"
      ) {
        const patch = body.paymentDefaults as Record<string, unknown>;
        const depositRaw = patch.defaultDepositAmount;
        const depositNext =
          depositRaw === null || depositRaw === ""
            ? undefined
            : depositRaw !== undefined
              ? Number(depositRaw)
              : s.paymentDefaults?.defaultDepositAmount;
        s.paymentDefaults = normalizePaymentDefaults({
          ...s.paymentDefaults,
          ...patch,
          defaultDepositAmount:
            depositNext !== undefined && Number.isFinite(depositNext)
              ? depositNext
              : undefined,
        });
      }

      if (
        section === "contact" &&
        body.contactPrefs &&
        typeof body.contactPrefs === "object"
      ) {
        const patch = body.contactPrefs as Record<string, unknown>;
        s.contactPrefs = normalizeContactPrefs({
          ...s.contactPrefs,
          ...patch,
          recipientEmail:
            patch.recipientEmail === null || patch.recipientEmail === ""
              ? undefined
              : patch.recipientEmail !== undefined
                ? String(patch.recipientEmail)
                : s.contactPrefs?.recipientEmail,
        });
      }

      if (
        section === "library" &&
        body.legalDefaults &&
        typeof body.legalDefaults === "object"
      ) {
        const patch = body.legalDefaults as Record<string, unknown>;
        const templateId =
          patch.defaultContractTemplateId === null ||
          patch.defaultContractTemplateId === ""
            ? undefined
            : patch.defaultContractTemplateId !== undefined
              ? String(patch.defaultContractTemplateId)
              : s.legalDefaults?.defaultContractTemplateId;
        s.legalDefaults = normalizeLegalDefaults({
          defaultContractTemplateId: templateId,
        });
      }

      s.updatedAt = new Date().toISOString();
      return s;
    },
  );

  if (!updated) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }

  if (nextSlugForIndex !== undefined) {
    await syncHomepageSlugIndex({
      studioId: admin.studioId,
      previousSlug,
      nextSlug: updated.homepage?.slug || nextSlugForIndex,
    });
  } else if (
    body.homepage &&
    typeof body.homepage === "object" &&
    previousSlug &&
    !updated.homepage?.slug
  ) {
    await syncHomepageSlugIndex({
      studioId: admin.studioId,
      previousSlug,
      nextSlug: "",
    });
  }

  return NextResponse.json({ ok: true });
}

/** Permanently delete the current studio (AURA-348). */
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const confirmName = String(body.confirmName || "").trim();
  const studioName = String(admin.studio.name || "").trim();
  if (!studioName || confirmName !== studioName) {
    return NextResponse.json(
      { error: "Type the studio name to confirm" },
      { status: 400 },
    );
  }

  try {
    await deleteStudioCascade({
      studioId: admin.studioId,
      ownerUid: admin.uid,
    });
    await logout();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[studio DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete studio" },
      { status: 500 },
    );
  }
}
