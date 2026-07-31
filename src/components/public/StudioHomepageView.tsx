import type { CSSProperties } from "react";
import { EnsureKitFonts } from "@/components/fonts/EnsureKitFonts";
import { HomepageModuleList } from "@/components/public/homepage/HomepageModules";
import { InstallHintDock } from "@/components/pwa/InstallHintDock";
import { PublicShell } from "@/components/shells/PublicShell";
import { cn } from "@/lib/cn";
import type { HomepagePayload } from "@/lib/homepage-payload";
import {
  resolveStudioThemePreset,
  studioThemeCssVars,
} from "@/lib/themes";

type Props = {
  data: HomepagePayload;
  /** When true, omit PublicShell chrome (builder phone frame). */
  bareInner?: boolean;
  /** Admin builder / preview — booking empty states (AURA-232) */
  preview?: boolean;
  className?: string;
};

/** Production homepage body — module schema renderer (AURA-224). */
export function StudioHomepageView({
  data,
  bareInner,
  preview = false,
  className,
}: Props) {
  const themePreset = resolveStudioThemePreset(data.studio.theme);
  const fontPreset = data.studio.theme?.fontPreset;
  const themeStyle = studioThemeCssVars(themePreset, {
    fontPreset,
  }) as CSSProperties;

  const body = (
    <div className="install-hint-pad min-w-0 overflow-x-clip">
      <HomepageModuleList data={data} preview={preview} />
    </div>
  );

  if (bareInner) {
    return (
      <div
        className={cn(
          /* Bare builder path — inherit DeviceFramePreview size container (AURA-439). */
          "min-h-full min-w-0 overflow-x-clip bg-canvas text-ink",
          className,
        )}
        style={themeStyle}
      >
        <EnsureKitFonts preset={fontPreset} />
        {body}
      </div>
    );
  }

  const slug = data.studio.slug?.trim();
  const installKey = slug
    ? `aura-install-dismiss-h-${slug}`
    : "aura-install-dismiss-h";

  return (
    <PublicShell
      bare
      style={themeStyle}
      fontPreset={fontPreset}
      className={className}
    >
      {body}
      {!preview ? <InstallHintDock storageKey={installKey} /> : null}
    </PublicShell>
  );
}
