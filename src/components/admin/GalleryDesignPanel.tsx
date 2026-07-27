"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Input,
  Label,
  Select,
  Switch,
} from "@/components/ui";
import type {
  GalleryCoverStyle,
  GalleryDesign,
  GalleryGridMode,
  GalleryThemeId,
} from "@/lib/types";
import { DEFAULT_GALLERY_DESIGN } from "@/lib/types";

const THEMES: { id: GalleryThemeId; label: string }[] = [
  { id: "echo", label: "Echo" },
  { id: "spring", label: "Spring" },
  { id: "lark", label: "Lark" },
  { id: "sage", label: "Sage" },
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

  async function save() {
    setSaving(true);
    try {
      await onSave({ design, showOnHomepage: onHome });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-xl">Design</h3>
          <p className="mt-1 text-sm text-muted">
            Client-facing look — cover, theme, and grid. Live preview on the right.
          </p>
        </div>

        <Field>
          <Label>Cover style</Label>
          <Select
            value={design.coverStyle}
            onChange={(e) =>
              setDesign((d) => ({
                ...d,
                coverStyle: e.target.value as GalleryCoverStyle,
              }))
            }
          >
            <option value="full">Full</option>
            <option value="third">Third</option>
            <option value="none">None</option>
          </Select>
        </Field>

        <Field>
          <Label>Theme</Label>
          <Select
            value={design.themeId}
            onChange={(e) =>
              setDesign((d) => ({
                ...d,
                themeId: e.target.value as GalleryThemeId,
              }))
            }
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>Photo layout</Label>
          <Select
            value={design.gridMode}
            onChange={(e) =>
              setDesign((d) => ({
                ...d,
                gridMode: e.target.value as GalleryGridMode,
              }))
            }
          >
            <option value="masonry">Masonry</option>
            <option value="justified">Justified</option>
            <option value="columns">Columns</option>
          </Select>
        </Field>

        <Field>
          <Label>Background</Label>
          <Input
            value={design.background || ""}
            placeholder="Theme default"
            onChange={(e) =>
              setDesign((d) => ({ ...d, background: e.target.value || undefined }))
            }
          />
        </Field>

        <Field>
          <Label>Accent</Label>
          <Input
            value={design.accent || ""}
            placeholder="Theme default"
            onChange={(e) =>
              setDesign((d) => ({ ...d, accent: e.target.value || undefined }))
            }
          />
        </Field>

        <Field>
          <Label>App icon URL</Label>
          <Input
            value={design.appIconUrl || ""}
            placeholder="Optional PWA icon"
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
          Show on gallery homepage
        </label>

        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save design"}
        </Button>
      </div>

      <div className="mx-auto w-[180px]">
        <p className="mb-2 text-center text-xs uppercase tracking-wider text-muted">
          Preview
        </p>
        <div
          className="overflow-hidden rounded-[1.75rem] border-[6px] border-ink shadow-lg"
          style={{ background: preview.bg, color: preview.ink }}
        >
          <div className="h-5 bg-ink/10" />
          {design.coverStyle !== "none" ? (
            <div
              className={
                design.coverStyle === "full" ? "h-36" : "h-20"
              }
              style={{
                background: coverPhotoUrl
                  ? `center/cover url(${coverPhotoUrl})`
                  : preview.accent,
              }}
            />
          ) : null}
          <div className="space-y-2 p-3">
            <div
              className="h-2 w-2/3 rounded"
              style={{ background: preview.accent, opacity: 0.85 }}
            />
            <div
              className={
                design.gridMode === "columns"
                  ? "grid grid-cols-2 gap-1"
                  : "columns-2 gap-1"
              }
            >
              {[0.9, 1.3, 1.1, 0.8, 1.4, 1].map((a, i) => (
                <div
                  key={i}
                  className="mb-1 break-inside-avoid rounded-sm"
                  style={{
                    aspectRatio: String(a),
                    background: `${preview.accent}33`,
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
