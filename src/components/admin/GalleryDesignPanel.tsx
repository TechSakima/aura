"use client";

import { useMemo, useState } from "react";
import { Button, Field, Input, Label, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import type {
  GalleryCoverStyle,
  GalleryDesign,
  GalleryGridMode,
  GalleryThemeId,
} from "@/lib/types";
import { DEFAULT_GALLERY_DESIGN } from "@/lib/types";

const THEMES: {
  id: GalleryThemeId;
  label: string;
  sample: string;
  fontClass: string;
}[] = [
  {
    id: "echo",
    label: "Echo",
    sample: "ECHO",
    fontClass: "font-sans text-[10px] font-semibold uppercase tracking-[0.14em]",
  },
  {
    id: "spring",
    label: "Spring",
    sample: "Spring",
    fontClass: "font-display text-[11px] tracking-wide",
  },
  {
    id: "lark",
    label: "Lark",
    sample: "Lark",
    fontClass: "font-sans text-[11px] font-medium tracking-tight",
  },
  {
    id: "sage",
    label: "Sage",
    sample: "Sage",
    fontClass: "font-display text-[12px] font-light italic tracking-wide",
  },
];

const COVER_STYLES: { id: GalleryCoverStyle; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "third", label: "Third" },
  { id: "none", label: "None" },
];

const GRID_MODES: { id: GalleryGridMode; label: string }[] = [
  { id: "masonry", label: "Masonry" },
  { id: "justified", label: "Justified" },
  { id: "columns", label: "Columns" },
];

const THEME_PREVIEW: Record<
  GalleryThemeId,
  { bg: string; accent: string; ink: string }
> = {
  echo: { bg: "#F3F3F3", accent: "#1D1D1D", ink: "#1D1D1D" },
  spring: { bg: "#F7F1EA", accent: "#3D5A40", ink: "#2A2A2A" },
  lark: { bg: "#EEF2F6", accent: "#1F3A5F", ink: "#15202B" },
  sage: { bg: "#F1F4EF", accent: "#4A5D4E", ink: "#222" },
};

function CoverStyleIcon({ id }: { id: GalleryCoverStyle }) {
  if (id === "none") {
    return (
      <span className="flex h-10 w-full items-end justify-center gap-0.5 px-2 pb-1.5">
        <span className="h-2 w-3 bg-ink/25" />
        <span className="h-3 w-3 bg-ink/25" />
        <span className="h-2.5 w-3 bg-ink/25" />
      </span>
    );
  }
  if (id === "third") {
    return (
      <span className="flex h-10 w-full flex-col">
        <span className="h-[38%] bg-ink/35" />
        <span className="flex flex-1 items-end justify-center gap-0.5 px-1.5 pb-1">
          <span className="h-1.5 w-2 bg-ink/20" />
          <span className="h-2 w-2 bg-ink/20" />
          <span className="h-1.5 w-2 bg-ink/20" />
        </span>
      </span>
    );
  }
  return (
    <span className="relative flex h-10 w-full items-center justify-center bg-ink/30">
      <span className="h-1 w-6 rounded-sm bg-surface/90" />
    </span>
  );
}

export function GalleryDesignPanel({
  design: initial,
  showOnHomepage,
  coverPhotoUrl,
  onSave,
}: {
  design?: GalleryDesign | null;
  showOnHomepage?: boolean;
  coverPhotoUrl?: string;
  onSave: (body: {
    design: GalleryDesign;
    showOnHomepage: boolean;
  }) => Promise<void>;
}) {
  const [design, setDesign] = useState<GalleryDesign>({
    ...DEFAULT_GALLERY_DESIGN,
    ...(initial || {}),
  });
  const [onHome, setOnHome] = useState(Boolean(showOnHomepage));
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const t = THEME_PREVIEW[design.themeId] || THEME_PREVIEW.echo;
    return {
      bg: design.background || t.bg,
      accent: design.accent || t.accent,
      ink: t.ink,
    };
  }, [design]);

  const themeMeta = THEMES.find((t) => t.id === design.themeId) || THEMES[0];

  async function save() {
    setSaving(true);
    try {
      await onSave({ design, showOnHomepage: onHome });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(200px,240px)]">
      <div className="space-y-8">
        <div>
          <h3 className="font-display text-xl">Design</h3>
          <p className="mt-1 text-sm text-muted">Cover, theme, and photo layout.</p>
        </div>

        <div className="space-y-3">
          <Label>Cover style</Label>
          <div className="grid grid-cols-3 gap-2">
            {COVER_STYLES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setDesign((d) => ({ ...d, coverStyle: c.id }))
                }
                className={cn(
                  "overflow-hidden rounded-md border text-left transition",
                  design.coverStyle === c.id
                    ? "border-accent ring-1 ring-accent"
                    : "border-line hover:border-ink/30",
                )}
              >
                <CoverStyleIcon id={c.id} />
                <span className="block border-t border-line px-2 py-1.5 text-center text-[11px] uppercase tracking-wider">
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setDesign((d) => ({ ...d, themeId: t.id }))
                }
                className={cn(
                  "rounded-md border p-2 text-left transition",
                  design.themeId === t.id
                    ? "border-accent ring-1 ring-accent"
                    : "border-line hover:border-ink/30",
                )}
              >
                <span
                  className="mb-2 flex h-14 items-center justify-center rounded-sm bg-ink text-surface"
                  style={{
                    background: coverPhotoUrl
                      ? `linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.2)), center/cover url(${coverPhotoUrl})`
                      : undefined,
                  }}
                >
                  <span className={cn(t.fontClass, "text-surface")}>
                    {t.sample}
                  </span>
                </span>
                <span className="text-[11px] uppercase tracking-wider">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Photo layout</Label>
          <div className="flex flex-wrap gap-2">
            {GRID_MODES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  setDesign((d) => ({ ...d, gridMode: g.id }))
                }
                className={cn(
                  "rounded-md border px-3 py-2 text-[11px] uppercase tracking-wider transition",
                  design.gridMode === g.id
                    ? "border-accent bg-accent text-surface"
                    : "border-line hover:border-ink/30",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label>Background</Label>
            <Input
              value={design.background || ""}
              placeholder="Theme default"
              onChange={(e) =>
                setDesign((d) => ({
                  ...d,
                  background: e.target.value || undefined,
                }))
              }
            />
          </Field>
          <Field>
            <Label>Accent</Label>
            <Input
              value={design.accent || ""}
              placeholder="Theme default"
              onChange={(e) =>
                setDesign((d) => ({
                  ...d,
                  accent: e.target.value || undefined,
                }))
              }
            />
          </Field>
        </div>

        <Field>
          <Label>App icon URL</Label>
          <Input
            value={design.appIconUrl || ""}
            placeholder="Optional"
            onChange={(e) =>
              setDesign((d) => ({
                ...d,
                appIconUrl: e.target.value || undefined,
              }))
            }
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={onHome}
            onCheckedChange={setOnHome}
            label="Show on homepage"
          />
          Show on homepage
        </label>

        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save design"}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-center text-xs uppercase tracking-wider text-muted">
          Preview
        </p>
        <div
          className="mx-auto w-[200px] overflow-hidden rounded-[1.75rem] border-[6px] border-ink shadow-lg"
          style={{ background: preview.bg, color: preview.ink }}
        >
          <div className="flex h-5 items-center justify-center gap-1 bg-ink/5">
            <span className="h-1 w-8 rounded-full bg-ink/20" />
          </div>

          {design.coverStyle !== "none" ? (
            <div
              className={cn(
                "relative flex flex-col items-center justify-center text-surface",
                design.coverStyle === "full" ? "h-44" : "h-24",
              )}
              style={{
                background: coverPhotoUrl
                  ? `linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.15)), center/cover url(${coverPhotoUrl})`
                  : `linear-gradient(135deg, ${preview.accent}, ${preview.ink})`,
              }}
            >
              <p className="text-[7px] uppercase tracking-[0.2em] text-surface/80">
                July 22nd, 2026
              </p>
              <p className={cn("mt-1 text-surface", themeMeta.fontClass)}>
                Gallery
              </p>
              <span className="mt-3 border border-surface/90 px-2.5 py-1 text-[7px] uppercase tracking-[0.18em]">
                View gallery
              </span>
            </div>
          ) : (
            <div className="px-3 pt-4 text-center">
              <p className={cn(themeMeta.fontClass)} style={{ color: preview.ink }}>
                Gallery
              </p>
            </div>
          )}

          <div className="p-2">
            <div
              className={cn(
                design.gridMode === "columns"
                  ? "grid grid-cols-2 gap-0.5"
                  : design.gridMode === "justified"
                    ? "flex flex-wrap gap-0.5"
                    : "columns-2 gap-0.5",
              )}
            >
              {[0.9, 1.3, 1.1, 0.8, 1.4, 1].map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "break-inside-avoid",
                    design.gridMode === "masonry" ? "mb-0.5" : "",
                    design.gridMode === "justified"
                      ? "h-8 grow basis-10"
                      : "",
                    design.gridMode === "columns" ? "aspect-[4/5]" : "",
                  )}
                  style={{
                    aspectRatio:
                      design.gridMode === "masonry" ? String(a) : undefined,
                    background: `${preview.accent}28`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-around border-t border-ink/10 py-2 text-[9px] text-ink/40">
            <span>⌂</span>
            <span>♡</span>
            <span>↗</span>
            <span>○</span>
          </div>
        </div>
      </div>
    </div>
  );
}
