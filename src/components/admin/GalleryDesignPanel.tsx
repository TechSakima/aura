"use client";

import { useMemo, useState } from "react";
import { Button, Field, Input, Label, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import type {
  GalleryCoverStyle,
  GalleryDesign,
  GalleryGridMode,
} from "@/lib/types";
import { DEFAULT_GALLERY_DESIGN } from "@/lib/types";
import {
  GALLERY_THEME_PRESETS,
  resolveGalleryTheme,
} from "@/lib/themes";

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
    // Themes own colors — drop legacy freeform overrides in the editor
    background: undefined,
    accent: undefined,
  });
  const [onHome, setOnHome] = useState(Boolean(showOnHomepage));
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => resolveGalleryTheme(design.themeId),
    [design.themeId],
  );

  const lightThemes = GALLERY_THEME_PRESETS.filter((t) => t.mode === "light");
  const darkThemes = GALLERY_THEME_PRESETS.filter((t) => t.mode === "dark");

  async function save() {
    setSaving(true);
    try {
      await onSave({
        design: {
          ...design,
          background: undefined,
          accent: undefined,
        },
        showOnHomepage: onHome,
      });
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
                  "overflow-hidden border text-left transition",
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

        <div className="space-y-4">
          <Label>Theme</Label>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Light
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {lightThemes.map((t) => (
                <ThemeSwatch
                  key={t.id}
                  theme={t}
                  selected={design.themeId === t.id}
                  coverPhotoUrl={coverPhotoUrl}
                  onSelect={() =>
                    setDesign((d) => ({
                      ...d,
                      themeId: t.id,
                      background: undefined,
                      accent: undefined,
                    }))
                  }
                />
              ))}
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Dark
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {darkThemes.map((t) => (
                <ThemeSwatch
                  key={t.id}
                  theme={t}
                  selected={design.themeId === t.id}
                  coverPhotoUrl={coverPhotoUrl}
                  onSelect={() =>
                    setDesign((d) => ({
                      ...d,
                      themeId: t.id,
                      background: undefined,
                      accent: undefined,
                    }))
                  }
                />
              ))}
            </div>
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
                  "min-h-11 border px-3 py-2 text-[11px] uppercase tracking-wider transition",
                  design.gridMode === g.id
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line hover:border-ink/30",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
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

        <label className="flex min-h-11 items-center gap-3 text-sm">
          <Switch
            checked={onHome}
            onCheckedChange={setOnHome}
            label="Show on homepage"
          />
          Show on homepage
        </label>

        <Button
          type="button"
          className="min-h-11"
          pending={saving}
          pendingLabel="Saving…"
          onClick={() => void save()}
        >
          Save design
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
              <p
                className={cn(
                  "mt-1 px-3 text-center text-surface",
                  preview.fontClass.replace("text-[10px]", "text-[9px]")
                    .replace("text-[11px]", "text-[10px]")
                    .replace("text-[12px]", "text-[11px]"),
                )}
              >
                {preview.sample}
              </p>
            </div>
          ) : null}

          <div className="space-y-2 p-3">
            <div
              className={cn(
                "grid gap-1",
                design.gridMode === "columns"
                  ? "grid-cols-2"
                  : design.gridMode === "justified"
                    ? "grid-cols-3"
                    : "grid-cols-2",
              )}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-ink/10",
                    design.gridMode === "masonry" && i === 1
                      ? "row-span-2 aspect-[3/4]"
                      : "aspect-square",
                  )}
                  style={{
                    background: `${preview.accent}28`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeSwatch({
  theme,
  selected,
  coverPhotoUrl,
  onSelect,
}: {
  theme: (typeof GALLERY_THEME_PRESETS)[number];
  selected: boolean;
  coverPhotoUrl?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "border p-2 text-left transition",
        selected
          ? "border-accent ring-1 ring-accent"
          : "border-line hover:border-ink/30",
      )}
    >
      <span
        className="mb-2 flex h-14 items-center justify-center"
        style={{
          background: coverPhotoUrl
            ? `linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.2)), center/cover url(${coverPhotoUrl})`
            : theme.bg,
          color: coverPhotoUrl ? "#faf8f5" : theme.ink,
          borderBottom: `3px solid ${theme.accent}`,
        }}
      >
        <span
          className={cn(theme.fontClass)}
          style={{ color: coverPhotoUrl ? "#faf8f5" : theme.ink }}
        >
          {theme.sample}
        </span>
      </span>
      <span className="text-[11px] uppercase tracking-wider">{theme.label}</span>
    </button>
  );
}
