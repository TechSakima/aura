"use client";

import {
  useReducer,
  useState,
  type CSSProperties,
} from "react";
import { DeviceFramePreview } from "@/components/admin/DeviceFramePreview";
import {
  Button,
  ButtonLink,
  Field,
  FileUploadButton,
  Label,
  SegmentedControl,
  Switch,
  Tabs,
  ThemeSwatch,
  useToast,
  useUploadSession,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  applyCoverTreatment,
  applyGalleryDesignPreset,
  normalizeGalleryDesign,
} from "@/lib/gallery-design";
import {
  COVER_FOCAL_PRESETS,
  COVER_TREATMENTS,
  effectiveCoverLayout,
} from "@/lib/gallery-cover-treatments";
import { resolveGalleryBrandCssVars } from "@/lib/gallery-brand";
import type {
  GalleryBrandSource,
  GalleryChromeVariant,
  GalleryCoverStyle,
  GalleryDensityPreference,
  GalleryDesign,
  GalleryGridMode,
  GalleryHeroLayout,
  GalleryMotionPreference,
  GalleryTitleTreatment,
  StudioTheme,
} from "@/lib/types";
import { GALLERY_THEME_PRESETS, resolveGalleryTheme } from "@/lib/themes";

const BRAND_SOURCE_OPTIONS: { id: GalleryBrandSource; label: string }[] = [
  { id: "studio", label: "Studio brand" },
  { id: "gallery", label: "Gallery preset" },
];

function CoverTreatmentIcon({ id }: { id: GalleryCoverStyle }) {
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
  if (id === "immersive") {
    return (
      <span className="relative flex h-10 w-full items-end justify-center bg-ink/40 pb-1.5">
        <span className="h-1.5 w-8 rounded-sm bg-surface/90" />
      </span>
    );
  }
  if (id === "split-title") {
    return (
      <span className="flex h-10 w-full items-end justify-between bg-ink/30 px-2 pb-1.5">
        <span className="h-1.5 w-6 rounded-sm bg-surface/90" />
        <span className="h-3 w-4 border border-surface/70" />
      </span>
    );
  }
  return (
    <span className="relative flex h-10 w-full items-center justify-center bg-ink/30">
      <span className="h-1 w-6 rounded-sm bg-surface/90" />
    </span>
  );
}

const HERO_LAYOUTS: { id: GalleryHeroLayout; label: string }[] = [
  { id: "split", label: "Split" },
  { id: "centered", label: "Centered" },
  { id: "vertical", label: "Vertical" },
  { id: "minimal", label: "Minimal" },
  { id: "cinematic", label: "Cinematic" },
];

const TITLE_TREATMENTS: { id: GalleryTitleTreatment; label: string }[] = [
  { id: "sans-wide", label: "Sans wide" },
  { id: "sans-tight", label: "Sans tight" },
  { id: "display-light", label: "Display" },
  { id: "display-vertical", label: "Vertical type" },
];

const CHROME_VARIANTS: { id: GalleryChromeVariant; label: string }[] = [
  { id: "sticky-minimal", label: "Sticky" },
  { id: "floating", label: "Floating" },
  { id: "bottom-bar", label: "Bottom bar" },
  { id: "branded", label: "Branded" },
];

const GRID_MODES: { id: GalleryGridMode; label: string }[] = [
  { id: "masonry", label: "Masonry" },
  { id: "justified", label: "Justified" },
  { id: "columns", label: "Columns" },
  { id: "diary", label: "Diary" },
];

const MOTION_OPTS: { id: GalleryMotionPreference; label: string }[] = [
  { id: "reduced", label: "Calm" },
  { id: "system", label: "System" },
  { id: "full", label: "Cinematic" },
];

const DENSITY_OPTS: { id: GalleryDensityPreference; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "comfortable", label: "Comfortable" },
  { id: "airy", label: "Airy" },
];

const MODULE_TABS = [
  { id: "preset", label: "Preset" },
  { id: "cover", label: "Cover" },
  { id: "chrome", label: "Chrome" },
  { id: "grid", label: "Grid" },
  { id: "selects", label: "Selects" },
  { id: "more", label: "More" },
] as const;

type ModuleTab = (typeof MODULE_TABS)[number]["id"];

type HistState = {
  past: GalleryDesign[];
  present: GalleryDesign;
};

type HistAction =
  | { type: "commit"; design: GalleryDesign }
  | { type: "undo" }
  | { type: "replace"; design: GalleryDesign };

function histReducer(state: HistState, action: HistAction): HistState {
  if (action.type === "undo") {
    if (!state.past.length) return state;
    const prev = state.past[state.past.length - 1];
    return { past: state.past.slice(0, -1), present: prev };
  }
  if (action.type === "replace") {
    return { past: [], present: action.design };
  }
  if (action.design === state.present) return state;
  return {
    past: [...state.past.slice(-39), state.present],
    present: action.design,
  };
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function titlePreviewClass(treatment: GalleryTitleTreatment): string {
  switch (treatment) {
    case "display-light":
      return "font-display text-[11px] font-light tracking-[0.08em]";
    case "display-vertical":
      return "font-display text-[10px] uppercase tracking-[0.18em] [writing-mode:vertical-rl] rotate-180";
    case "sans-tight":
      return "font-sans text-[9px] font-semibold uppercase tracking-[0.12em]";
    case "sans-wide":
    default:
      return "font-sans text-[9px] font-semibold uppercase tracking-[0.16em]";
  }
}

function DevicePreview({
  design,
  coverPhotoUrl,
  studioTheme,
}: {
  design: GalleryDesign;
  coverPhotoUrl?: string;
  studioTheme?: StudioTheme | null;
}) {
  const themeStyle = resolveGalleryBrandCssVars(
    design,
    studioTheme,
  ) as CSSProperties;
  const layoutSample = resolveGalleryTheme(design.themeId).sample;
  const cover = design.cover;
  const layout = effectiveCoverLayout(cover);

  return (
    <DeviceFramePreview
      label="Gallery"
      frameStyle={themeStyle}
      frameClassName="bg-canvas"
    >
      <div
        data-gallery-motion={design.motion}
        data-gallery-density={design.density}
      >
        <div className="flex h-5 items-center justify-center gap-1 bg-ink/5">
          <span className="h-1 w-8 rounded-full bg-ink/20" />
        </div>

        {design.chrome.variant === "bottom-bar" ? null : (
          <div
            className={cn(
              "flex items-center justify-between gap-2 border-b border-line px-3 py-2",
              design.chrome.variant === "floating" &&
                "mx-2 mt-2 rounded-md border bg-surface/90",
              design.chrome.variant === "branded" && "bg-accent text-accent-ink",
            )}
          >
            <div className="min-w-0">
              {design.chrome.showStudioName ? (
                <p
                  className={cn(
                    "truncate text-[8px] font-semibold uppercase tracking-[0.14em]",
                    design.chrome.variant === "branded"
                      ? "text-accent-ink"
                      : "text-ink",
                  )}
                >
                  Studio
                </p>
              ) : null}
              {design.chrome.showLogo ? (
                <p
                  className={cn(
                    "text-[7px] uppercase tracking-wider",
                    design.chrome.variant === "branded"
                      ? "text-accent-ink/80"
                      : "text-muted",
                  )}
                >
                  Logo
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "text-[7px] uppercase tracking-wider",
                design.chrome.variant === "branded"
                  ? "text-accent-ink/80"
                  : "text-muted",
              )}
            >
              Actions
            </span>
          </div>
        )}

        {cover.style !== "none" ? (
          <div
            className={cn(
              "relative flex overflow-hidden text-on-media",
              cover.style === "third"
                ? "h-24"
                : cover.style === "immersive" || layout === "cinematic"
                  ? "h-56"
                  : layout === "minimal"
                    ? "h-36"
                    : "h-44",
              layout === "vertical"
                ? "items-start justify-start pl-3 pt-6"
                : layout === "centered" || layout === "cinematic"
                  ? "items-center justify-center"
                  : layout === "minimal"
                    ? "items-end justify-start p-3"
                    : "items-end justify-center pb-4",
            )}
          >
            {coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPhotoUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={
                  cover.focalX != null && cover.focalY != null
                    ? { objectPosition: `${cover.focalX}% ${cover.focalY}%` }
                    : undefined
                }
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-accent via-ink to-scrim-strong" />
            )}
            <div
              className={cn(
                "absolute inset-0",
                cover.scrim === "strong"
                  ? "bg-gradient-to-t from-scrim-strong via-scrim/70 to-scrim/40"
                  : "bg-gradient-to-t from-scrim-strong via-scrim/40 to-scrim/20",
              )}
            />
            <div
              className={cn(
                "relative z-10 flex w-full max-w-[90%] flex-col gap-1 px-2",
                layout === "split" &&
                  "sm:flex-row sm:items-end sm:justify-between",
                (layout === "centered" || layout === "cinematic") &&
                  "items-center text-center",
                layout === "minimal" && "items-start text-left",
              )}
            >
              <div>
                {cover.showDate && layout !== "vertical" ? (
                  <p className="text-[6px] uppercase tracking-[0.22em] text-on-media-muted">
                    Jul 22, 2026
                  </p>
                ) : null}
                <p className={cn("mt-0.5 text-on-media", titlePreviewClass(cover.titleTreatment))}>
                  {layoutSample}
                </p>
                {cover.showDaysLeft && layout !== "vertical" ? (
                  <p className="mt-1 text-[6px] uppercase tracking-[0.14em] text-on-media-muted">
                    14 days left
                  </p>
                ) : null}
              </div>
              {cover.showCta ? (
                <span className="mt-2 inline-flex min-h-7 items-center border border-on-media/40 px-2 text-[6px] uppercase tracking-wider text-on-media">
                  View gallery
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-2 bg-canvas p-3">
          <div
            className={cn(
              design.grid.mode === "diary"
                ? "flex flex-col gap-2"
                : "grid gap-1",
              design.grid.mode === "columns"
                ? "grid-cols-2"
                : design.grid.mode === "justified"
                  ? "grid-cols-3"
                  : design.grid.mode === "diary"
                    ? ""
                    : "grid-cols-2",
            )}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "bg-accent/20",
                  design.grid.mode === "diary"
                    ? "aspect-[3/4]"
                    : design.grid.mode === "masonry" && i === 1
                      ? "row-span-2 aspect-[3/4]"
                      : "aspect-square",
                )}
              />
            ))}
          </div>
          {design.selects.showCount ? (
            <p className="text-[7px] uppercase tracking-wider text-muted">
              0 selected
            </p>
          ) : null}
        </div>

        {design.chrome.variant === "bottom-bar" ? (
          <div className="flex items-center justify-around border-t border-line bg-surface px-2 py-2.5">
            {["Fav", "Save", "Share"].map((label) => (
              <span
                key={label}
                className="text-[7px] uppercase tracking-wider text-muted"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </DeviceFramePreview>
  );
}

export function GalleryDesignPanel({
  design: initial,
  coverPhotoUrl,
  studioTheme,
  onSave,
  /** Inside Delivery Layout — drop duplicate title. */
  embedded = false,
}: {
  design?: GalleryDesign | null;
  coverPhotoUrl?: string;
  /** Studio brand kit theme slice for inherit preview (AURA-251). */
  studioTheme?: StudioTheme | null;
  onSave: (body: { design: GalleryDesign }) => Promise<void>;
  embedded?: boolean;
}) {
  const [hist, dispatch] = useReducer(histReducer, undefined, () => ({
    past: [] as GalleryDesign[],
    present: normalizeGalleryDesign({
      ...(initial || {}),
      background: undefined,
      accent: undefined,
    }),
  }));
  const design = hist.present;
  const [moduleTab, setModuleTab] = useState<ModuleTab>("preset");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
  const uploadSession = useUploadSession();
  const appIconPreview = resolveMediaUrl(design.appIconUrl);

  const lightThemes = GALLERY_THEME_PRESETS.filter((t) => t.mode === "light");
  const darkThemes = GALLERY_THEME_PRESETS.filter((t) => t.mode === "dark");
  const canUndo = hist.past.length > 0;

  async function uploadAppIcon(files: File[]) {
    await uploadSession.runUpload({
      title: "Uploading icon",
      files,
      uploadFile: async (file) => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/uploads/reference", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          push("Could not upload app icon", "danger");
          throw new Error("Upload failed");
        }
        const data = await res.json().catch(() => ({}));
        const url = data.url ? String(data.url) : "";
        if (!url) {
          push("Could not upload app icon", "danger");
          throw new Error("Upload failed");
        }
        commit({ ...design, appIconUrl: url });
        push("App icon updated", "success");
      },
    });
  }

  function commit(next: GalleryDesign | ((d: GalleryDesign) => GalleryDesign)) {
    const resolved =
      typeof next === "function" ? next(design) : next;
    dispatch({
      type: "commit",
      design: normalizeGalleryDesign({
        ...resolved,
        background: undefined,
        accent: undefined,
      }),
    });
  }

  function patchCover(partial: Partial<GalleryDesign["cover"]>) {
    commit({
      ...design,
      cover: { ...design.cover, ...partial },
    });
  }

  function resetToPreset() {
    commit(
      applyGalleryDesignPreset(design, design.themeId, {
        preserveCoverStyle: true,
        preserveGridMode: false,
      }),
    );
  }

  async function save() {
    setSaving(true);
    try {
      await onSave({
        design: {
          ...design,
          background: undefined,
          accent: undefined,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between",
          embedded && "sm:items-center",
        )}
      >
        {embedded ? (
          <p className="text-sm text-muted">Preview updates live.</p>
        ) : (
          <div>
            <h3 className="font-display text-xl">Design</h3>
            <p className="mt-1 text-sm text-muted">
              Preset, then modules. Preview updates live.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            tone="ghost"
            className="min-h-11 w-full sm:w-auto"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "undo" })}
          >
            Undo
          </Button>
          <Button
            type="button"
            tone="ghost"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => resetToPreset()}
          >
            Reset preset
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            pending={saving}
            pendingLabel="Saving…"
            onClick={() => void save()}
          >
            Save design
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,min(100%,26rem))] lg:items-start">
        <div className="order-2 space-y-6 lg:order-1">
          <Tabs
            aria-label="Design modules"
            variant="progress"
            tabs={[...MODULE_TABS]}
            value={moduleTab}
            onChange={(id) => setModuleTab(id as ModuleTab)}
          />

          {moduleTab === "preset" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Brand colors</Label>
                <SegmentedControl
                  ariaLabel="Brand colors"
                  options={BRAND_SOURCE_OPTIONS}
                  value={design.brandSource}
                  onChange={(id) =>
                    commit({
                      ...design,
                      brandSource: id,
                    })
                  }
                />
                {design.brandSource === "studio" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">
                      Colors and fonts from studio brand. Layout uses the
                      preset below.
                    </p>
                    <ButtonLink
                      href="/admin/settings/brand"
                      tone="ghost"
                      size="sm"
                      className="min-h-11"
                    >
                      Edit brand
                    </ButtonLink>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <Label>
                  {design.brandSource === "studio"
                    ? "Layout preset"
                    : "Design preset"}
                </Label>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">
                    Light
                  </p>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {lightThemes.map((t) => (
                      <ThemeSwatch
                        key={t.id}
                        theme={t}
                        selected={design.themeId === t.id}
                        coverPhotoUrl={coverPhotoUrl}
                        onSelect={() =>
                          commit(
                            applyGalleryDesignPreset(design, t.id, {
                              preserveCoverStyle: true,
                              preserveGridMode: false,
                            }),
                          )
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">
                    Dark
                  </p>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {darkThemes.map((t) => (
                      <ThemeSwatch
                        key={t.id}
                        theme={t}
                        selected={design.themeId === t.id}
                        coverPhotoUrl={coverPhotoUrl}
                        onSelect={() =>
                          commit(
                            applyGalleryDesignPreset(design, t.id, {
                              preserveCoverStyle: true,
                              preserveGridMode: false,
                            }),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {moduleTab === "cover" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Cover treatment</Label>
                <div
                  role="group"
                  aria-label="Cover treatment"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                >
                  {COVER_TREATMENTS.map((t) => {
                    const selected = design.cover.style === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => commit(applyCoverTreatment(design, t.id))}
                        className={cn(
                          "min-h-11 overflow-hidden border text-left transition",
                          selected
                            ? "border-accent bg-accent/5"
                            : "border-line bg-surface hover:border-ink/30",
                        )}
                      >
                        <CoverTreatmentIcon id={t.id} />
                        <span className="block px-2 pb-2 pt-1">
                          <span className="block text-[11px] font-medium uppercase tracking-wider text-ink">
                            {t.label}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted">
                            {t.detail}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {design.cover.style !== "none" ? (
                <>
                  <div className="space-y-3">
                    <Label>Focal point</Label>
                    <div className="relative mx-auto aspect-[4/3] w-full max-w-[280px] overflow-hidden border border-line bg-canvas">
                      {coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverPhotoUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{
                            objectPosition: `${design.cover.focalX ?? 50}% ${design.cover.focalY ?? 50}%`,
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-ink/20 to-canvas" />
                      )}
                      <div
                        role="group"
                        aria-label="Focal point"
                        className="absolute inset-0 grid grid-cols-3 grid-rows-3"
                      >
                        {COVER_FOCAL_PRESETS.map((f) => {
                          const active =
                            (design.cover.focalX ?? 50) === f.x &&
                            (design.cover.focalY ?? 50) === f.y;
                          return (
                            <button
                              key={f.label}
                              type="button"
                              aria-label={f.label}
                              aria-pressed={active}
                              className={cn(
                                "min-h-11 min-w-0 border border-transparent",
                                active
                                  ? "bg-accent/35 ring-2 ring-inset ring-accent"
                                  : "hover:bg-on-media/10",
                              )}
                              onClick={() =>
                                patchCover({ focalX: f.x, focalY: f.y })
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Title placement</Label>
                    <SegmentedControl
                      ariaLabel="Title placement"
                      options={HERO_LAYOUTS}
                      value={design.cover.layout}
                      onChange={(id) => patchCover({ layout: id })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Title treatment</Label>
                    <SegmentedControl
                      ariaLabel="Title treatment"
                      options={TITLE_TREATMENTS}
                      value={design.cover.titleTreatment}
                      onChange={(id) => patchCover({ titleTreatment: id })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Scrim</Label>
                    <SegmentedControl
                      ariaLabel="Cover scrim"
                      options={[
                        { id: "soft", label: "Soft" },
                        { id: "strong", label: "Strong" },
                      ]}
                      value={design.cover.scrim === "strong" ? "strong" : "soft"}
                      onChange={(id) => patchCover({ scrim: id })}
                    />
                  </div>
                  <div className="space-y-1">
                    <SwitchRow
                      id="cover-date"
                      label="Show date"
                      checked={design.cover.showDate}
                      onChange={(next) => patchCover({ showDate: next })}
                    />
                    <SwitchRow
                      id="cover-days"
                      label="Show days left"
                      checked={design.cover.showDaysLeft}
                      onChange={(next) => patchCover({ showDaysLeft: next })}
                    />
                    <SwitchRow
                      id="cover-cta"
                      label="Show view CTA"
                      checked={design.cover.showCta}
                      onChange={(next) => patchCover({ showCta: next })}
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {moduleTab === "chrome" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Chrome</Label>
                <SegmentedControl
                  ariaLabel="Gallery chrome"
                  options={CHROME_VARIANTS}
                  value={design.chrome.variant}
                  onChange={(id) =>
                    commit({
                      ...design,
                      chrome: { ...design.chrome, variant: id },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <SwitchRow
                  id="chrome-name"
                  label="Studio name"
                  checked={design.chrome.showStudioName}
                  onChange={(next) =>
                    commit({
                      ...design,
                      chrome: { ...design.chrome, showStudioName: next },
                    })
                  }
                />
                <SwitchRow
                  id="chrome-logo"
                  label="Logo"
                  checked={design.chrome.showLogo}
                  onChange={(next) =>
                    commit({
                      ...design,
                      chrome: { ...design.chrome, showLogo: next },
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          {moduleTab === "grid" ? (
            <div className="space-y-3">
              <Label>Photo layout</Label>
              <SegmentedControl
                ariaLabel="Photo layout"
                options={GRID_MODES}
                value={design.grid.mode}
                onChange={(id) =>
                  commit({
                    ...design,
                    gridMode: id,
                    grid: { mode: id },
                  })
                }
              />
            </div>
          ) : null}

          {moduleTab === "selects" ? (
            <div className="space-y-1">
              <SwitchRow
                id="selects-count"
                label="Show select count"
                checked={design.selects.showCount}
                onChange={(next) =>
                  commit({
                    ...design,
                    selects: { ...design.selects, showCount: next },
                  })
                }
              />
              <SwitchRow
                id="selects-submit"
                label="Submit selects"
                checked={design.selects.submitEnabled}
                onChange={(next) =>
                  commit({
                    ...design,
                    selects: { ...design.selects, submitEnabled: next },
                  })
                }
              />
            </div>
          ) : null}

          {moduleTab === "more" ? (
            <div className="space-y-6">
              <SwitchRow
                id="download-pin"
                label="Emphasize download PIN"
                checked={design.download.emphasizePin}
                onChange={(next) =>
                  commit({
                    ...design,
                    download: { emphasizePin: next },
                  })
                }
              />
              <SwitchRow
                id="coach-tips"
                label="First-visit tips"
                checked={design.coach.enabled}
                onChange={(next) =>
                  commit({
                    ...design,
                    coach: { enabled: next },
                  })
                }
              />
              <div className="space-y-3">
                <Label>Motion</Label>
                <SegmentedControl
                  ariaLabel="Motion preference"
                  options={MOTION_OPTS}
                  value={design.motion}
                  onChange={(id) => commit({ ...design, motion: id })}
                />
              </div>
              <div className="space-y-3">
                <Label>Density</Label>
                <SegmentedControl
                  ariaLabel="Spacing density"
                  options={DENSITY_OPTS}
                  value={design.density}
                  onChange={(id) => commit({ ...design, density: id })}
                />
              </div>
              <Field>
                <Label>App icon</Label>
                {appIconPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appIconPreview}
                    alt=""
                    className="mb-2 size-16 rounded-md object-cover"
                  />
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <FileUploadButton
                    label={design.appIconUrl ? "Replace icon" : "Upload icon"}
                    tone="neutral"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadAppIcon(files)}
                  />
                  {design.appIconUrl ? (
                    <Button
                      type="button"
                      tone="ghost"
                      className="min-h-11 w-full sm:w-auto"
                      onClick={() =>
                        commit({ ...design, appIconUrl: undefined })
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </Field>
              {uploadSession.dialog}
              <ButtonLink
                href="/admin/settings/website#featured"
                tone="ghost"
                className="w-full sm:w-auto"
              >
                Featured collections
              </ButtonLink>
            </div>
          ) : null}
        </div>

        <div className="order-1 lg:sticky lg:top-[var(--admin-sticky-top)] lg:order-2 lg:self-start">
          <DevicePreview
            design={design}
            coverPhotoUrl={coverPhotoUrl}
            studioTheme={studioTheme}
          />
        </div>
      </div>
    </div>
  );
}
