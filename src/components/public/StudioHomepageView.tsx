import type { CSSProperties } from "react";
import { HomepageModuleList } from "@/components/public/homepage/HomepageModules";
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
  const themeStyle = studioThemeCssVars(themePreset, {
    fontPreset: data.studio.theme?.fontPreset,
  }) as CSSProperties;

  const body = (
    <div className="pb-16">
      <HomepageModuleList data={data} preview={preview} />
    </div>
  );

  if (bareInner) {
    return (
      <div
        className={cn("min-h-full bg-canvas text-ink", className)}
        style={themeStyle}
      >
        {body}
      </div>
    );
  }

  return (
    <PublicShell bare style={themeStyle} className={className}>
      {body}
    </PublicShell>
  );
}
