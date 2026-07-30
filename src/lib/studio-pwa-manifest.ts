import {
  galleryPwaShortName,
  pwaManifestIcons,
} from "@/lib/gallery-pwa-manifest";
import { resolveStudioThemePreset } from "@/lib/themes";
import type { Studio } from "@/lib/types";

/** Prefer mark for app icons; lockup/wordmark/logo as fallback (AURA-289). */
export function studioPwaIconMediaUrl(studio?: Studio | null): string | undefined {
  const logos = studio?.brandKit?.logos;
  return (
    logos?.markUrl ||
    logos?.lockupUrl ||
    logos?.wordmarkUrl ||
    studio?.logoUrl ||
    undefined
  );
}

/** OS chrome / theme-color uses kit canvas (background), not accent (AURA-295). */
export function isDarkPwaBackground(hex: string): boolean {
  const h = hex.replace("#", "").trim();
  if (h.length < 6) return false;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export function appleStatusBarForBackground(
  hex: string,
): "black-translucent" | "default" {
  return isDarkPwaBackground(hex) ? "black-translucent" : "default";
}

/** Studio brand slice for admin / homepage / book manifests (AURA-288 / 295). */
export function studioPwaBrand(studio?: Studio | null) {
  const name = studio?.name?.trim() || "Aura";
  const preset = resolveStudioThemePreset(studio?.theme);
  return {
    name,
    shortName: galleryPwaShortName(name),
    mode: preset.mode,
    backgroundColor: preset.background,
    /** Matches page canvas so status bar blends with light/dark kits. */
    themeColor: preset.background,
    logoUrl: studioPwaIconMediaUrl(studio),
  };
}

export function buildWebManifest(opts: {
  id?: string;
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  scope: string;
  backgroundColor: string;
  themeColor: string;
  /** Query for `/api/pwa-icon` without size/purpose (e.g. `token=…` or `surface=admin`). */
  iconQuery?: string | null;
  /** Prefer existing installed window for same-scope links (AURA-296 admin). */
  preferExistingWindow?: boolean;
}) {
  return {
    id: opts.id ?? opts.startUrl,
    name: opts.name,
    short_name: opts.shortName,
    description: opts.description,
    start_url: opts.startUrl,
    scope: opts.scope,
    display: "standalone" as const,
    background_color: opts.backgroundColor,
    theme_color: opts.themeColor,
    icons: pwaManifestIcons(opts.iconQuery),
    ...(opts.preferExistingWindow
      ? {
          launch_handler: {
            client_mode: ["navigate-existing", "auto"],
          },
          handle_links: "preferred",
        }
      : {}),
  };
}

export function webManifestResponse(manifest: ReturnType<typeof buildWebManifest>) {
  return {
    body: manifest,
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  };
}
