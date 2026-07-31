"use client";

import { useEffect, useState } from "react";
import { DeviceFramePreview } from "@/components/admin/DeviceFramePreview";
import { WebsiteReadinessChecklist } from "@/components/admin/WebsiteReadinessChecklist";
import { StudioHomepageView } from "@/components/public/StudioHomepageView";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Label,
  LayoutTemplateSwatch,
  SegmentedControl,
  Select,
  Switch,
  useConfirm,
  useToast,
} from "@/components/ui";
import { mutateJson } from "@/lib/client/mutation";
import {
  asHeroVariant,
  enabledHomepageModules,
  HOMEPAGE_COLLECTIONS_LAYOUTS,
  HOMEPAGE_HERO_VARIANTS,
  HOMEPAGE_MODULE_LABELS,
} from "@/lib/homepage-modules";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type { HomepagePayload } from "@/lib/homepage-payload";
import {
  SITE_LAYOUT_TEMPLATES,
  cloneSiteLayoutModules,
  siteLayoutTheme,
  type SiteLayoutId,
} from "@/lib/site-layouts";
import { websiteReadinessItems } from "@/lib/website-readiness";
import type {
  HomepageCollectionsLayout,
  HomepageHeroVariant,
  Studio,
  StudioHomepageModule,
} from "@/lib/types";
import { cn } from "@/lib/cn";

type ReadinessStudio = Pick<
  Studio,
  | "logoUrl"
  | "brandKit"
  | "theme"
  | "ownerEmail"
  | "phone"
  | "website"
  | "addressLine1"
  | "socialLinks"
>;

type PreviewMeta = {
  enabled: boolean;
  slug: string;
  hasPassword: boolean;
  layout: HomepageCollectionsLayout;
  modules: StudioHomepageModule[];
  readinessStudio?: ReadinessStudio;
};

function collectionsLayout(modules: StudioHomepageModule[]): HomepageCollectionsLayout {
  const col = modules.find((m) => m.type === "collections");
  return col?.type === "collections" ? col.props.layout : "masonry";
}

function buildPreviewPayload(
  base: HomepagePayload,
  modules: StudioHomepageModule[],
  slug: string,
): HomepagePayload {
  const enabled = enabledHomepageModules(modules);
  const bookingOn = enabled.some((m) => m.type === "bookingCta");
  const layout = collectionsLayout(modules);
  return {
    ...base,
    modules: enabled,
    studio: {
      ...base.studio,
      layout,
      showBooking: bookingOn,
      bookingHref: base.studio.bookingReady ? base.studio.bookingHref : undefined,
      bookingReady: base.studio.bookingReady,
      bookingBlockReason: base.studio.bookingBlockReason,
    },
  };
}

export function WebsiteBuilder() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [applyingLayout, setApplyingLayout] = useState(false);
  const [basePayload, setBasePayload] = useState<HomepagePayload | null>(null);
  const [meta, setMeta] = useState<PreviewMeta | null>(null);
  const [modules, setModules] = useState<StudioHomepageModule[]>([]);
  const [dirty, setDirty] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [appliedLayoutId, setAppliedLayoutId] = useState<SiteLayoutId | null>(
    null,
  );
  useUnsavedChangesGuard(dirty);

  async function load() {
    const res = await fetch("/api/studio/homepage/preview");
    if (!res.ok) {
      push("Could not load preview", "danger");
      setLoading(false);
      return;
    }
    const data = await res.json();
    const nextMeta = data.meta as PreviewMeta;
    setMeta(nextMeta);
    setModules(nextMeta.modules || data.modules || []);
    setBasePayload({
      studio: data.studio,
      galleries: data.galleries || [],
      modules: data.modules || [],
      featuredGallery: data.featuredGallery ?? null,
    });
    setDirty(false);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function markDirty(next: StudioHomepageModule[]) {
    setModules(next);
    setDirty(true);
  }

  function moveModule(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= modules.length) return;
    const next = [...modules];
    const [row] = next.splice(index, 1);
    if (!row) return;
    next.splice(target, 0, row);
    markDirty(next);
  }

  function toggleModule(id: string, enabled: boolean) {
    markDirty(
      modules.map((m) => (m.id === id ? { ...m, enabled } : m)),
    );
  }

  function setPortfolioLayout(layout: HomepageCollectionsLayout) {
    markDirty(
      modules.map((m) =>
        m.type === "collections"
          ? { ...m, props: { ...m.props, layout } }
          : m,
      ),
    );
  }

  function patchHero(
    id: string,
    patch: Partial<{
      variant: HomepageHeroVariant;
      showLogo: boolean;
      showName: boolean;
      showCta: boolean;
    }>,
  ) {
    markDirty(
      modules.map((m) =>
        m.id === id && m.type === "hero"
          ? { ...m, props: { ...m.props, ...patch } }
          : m,
      ),
    );
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = modules.findIndex((m) => m.id === dragId);
    const to = modules.findIndex((m) => m.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...modules];
    const [row] = next.splice(from, 1);
    if (!row) {
      setDragId(null);
      return;
    }
    next.splice(to, 0, row);
    markDirty(next);
    setDragId(null);
  }

  async function saveModules() {
    setSaving(true);
    try {
      const result = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "website",
            homepage: { modules },
          }),
        },
        { action: "save" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      setDirty(false);
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              modules,
              layout: collectionsLayout(modules),
            }
          : prev,
      );
      push(
        meta?.enabled ? "Live site updated" : "Saved to draft",
        "success",
      );
    } finally {
      setSaving(false);
    }
  }

  async function applyLayout(templateId: SiteLayoutId) {
    const template = SITE_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const ok = await confirm({
      title: `Apply ${template.label}`,
      message: dirty
        ? "Replaces unsaved modules and brand colors. Logos stay."
        : "Replaces modules and brand colors. Logos stay.",
      confirmLabel: "Apply",
      tone: "accent",
    });
    if (!ok) return;

    const nextModules = cloneSiteLayoutModules(template);
    const theme = siteLayoutTheme(template);
    setApplyingLayout(true);
    try {
      const brandRes = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: "brand", theme }),
        },
        { action: "apply brand kit" },
      );
      if (!brandRes.ok) {
        push(brandRes.errorMessage, "danger");
        return;
      }

      const modRes = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "website",
            homepage: { modules: nextModules },
          }),
        },
        { action: "save modules" },
      );
      if (!modRes.ok) {
        push("Brand updated; modules failed to save", "danger");
        return;
      }

      setAppliedLayoutId(templateId);
      push(`${template.label} applied`, "success");
      await load();
    } finally {
      setApplyingLayout(false);
    }
  }

  async function setPublished(enabled: boolean) {
    if (!meta?.slug?.trim() && enabled) {
      push("Set a site URL in Website settings first", "danger");
      return;
    }
    if (dirty) {
      push("Save modules before publishing", "danger");
      return;
    }
    setPublishing(true);
    try {
      const result = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "website",
            homepage: { enabled },
          }),
        },
        { action: enabled ? "publish" : "unpublish" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      setMeta((prev) => (prev ? { ...prev, enabled } : prev));
      push(
        enabled ? "Site is live" : "Site is draft — visitors cannot open it",
        "success",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading builder…" />;
  }

  if (!basePayload || !meta) {
    return (
      <EmptyState
        variant="error"
        title="Could not load website"
        action={
          <Button type="button" onClick={() => void load()}>
            Retry
          </Button>
        }
      />
    );
  }

  const published = meta.enabled;
  const layout = collectionsLayout(modules);
  const preview = buildPreviewPayload(basePayload, modules, meta.slug);
  const readinessItems = meta.readinessStudio
    ? websiteReadinessItems({
        studio: meta.readinessStudio,
        modules,
        bookingReady: Boolean(basePayload.studio.bookingReady),
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl">Site builder</h1>
            <Badge tone={published ? "success" : "neutral"}>
              {published ? "Published" : "Draft"}
            </Badge>
            {dirty ? <Badge tone="neutral">Unsaved</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {published && meta.slug
              ? `Live at /h/${meta.slug}`
              : "Draft — publish to make /h public"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <ButtonLink
            href="/admin/settings/website"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Website settings
          </ButtonLink>
          <ButtonLink
            href="/admin/website/preview"
            tone="neutral"
            className="w-full sm:w-auto"
          >
            Open preview
          </ButtonLink>
          {published && meta.slug ? (
            <Button
              type="button"
              tone="ghost"
              className="w-full sm:w-auto"
              onClick={() =>
                window.open(`/h/${meta.slug}`, "_blank", "noopener")
              }
            >
              View live site
            </Button>
          ) : null}
          {published ? (
            <Button
              type="button"
              tone="ghost"
              pending={publishing}
              pendingLabel="Updating…"
              className="w-full sm:w-auto"
              onClick={() => void setPublished(false)}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              tone="accent"
              pending={publishing}
              pendingLabel="Publishing…"
              className="w-full sm:w-auto"
              onClick={() => void setPublished(true)}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      <WebsiteReadinessChecklist items={readinessItems} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="order-2 min-w-0 space-y-5 p-4 lg:order-1">
          <div>
            <h2 className="font-display text-xl">Layout</h2>
            <div
              className="mt-3 grid grid-cols-2 gap-2"
              role="group"
              aria-label="Layout templates"
            >
              {SITE_LAYOUT_TEMPLATES.map((template) => (
                <LayoutTemplateSwatch
                  key={template.id}
                  template={template}
                  selected={appliedLayoutId === template.id}
                  disabled={applyingLayout}
                  onSelect={() => void applyLayout(template.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl">Modules</h2>
            <p className="mt-1 text-xs text-muted">
              {published
                ? "Save updates the live site. Publish stays on until you unpublish."
                : "Save keeps a draft. Publish makes /h public."}
            </p>
          </div>

          <ul className="space-y-2">
            {modules.map((mod, index) => (
              <li
                key={mod.id}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                }}
                onDrop={() => onDrop(mod.id)}
                className={cn(
                  "rounded-md border border-line bg-surface p-3",
                  dragId === mod.id ? "opacity-60" : "",
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Desktop-only HTML5 drag — phone uses Move up/down (AURA-440). */}
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDragId(mod.id)}
                    onDragEnd={() => setDragId(null)}
                    className="mt-2 hidden min-h-11 min-w-11 cursor-grab select-none items-center justify-center text-muted active:cursor-grabbing lg:inline-flex"
                    aria-label={`Drag to reorder ${HOMEPAGE_MODULE_LABELS[mod.type]}`}
                    title="Drag to reorder"
                  >
                    ::
                  </button>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex min-h-11 items-center justify-between gap-3">
                      <p className="text-sm font-medium text-ink">
                        {HOMEPAGE_MODULE_LABELS[mod.type]}
                      </p>
                      <Switch
                        checked={mod.enabled}
                        onCheckedChange={(next) =>
                          toggleModule(mod.id, next)
                        }
                        label={`${HOMEPAGE_MODULE_LABELS[mod.type]} on`}
                      />
                    </div>
                    {mod.type === "hero" && mod.enabled ? (
                      <div className="space-y-3">
                        <Field>
                          <Label>Hero layout</Label>
                          <SegmentedControl
                            ariaLabel="Hero layout"
                            value={asHeroVariant(mod.props.variant)}
                            onChange={(variant) =>
                              patchHero(mod.id, { variant })
                            }
                            options={HOMEPAGE_HERO_VARIANTS.map((v) => ({
                              id: v.id,
                              label: v.label,
                            }))}
                          />
                        </Field>
                        <div className="flex min-h-11 items-center justify-between gap-3">
                          <Label>Logo</Label>
                          <Switch
                            checked={mod.props.showLogo !== false}
                            onCheckedChange={(next) =>
                              patchHero(mod.id, { showLogo: next })
                            }
                            label="Show logo"
                          />
                        </div>
                        <div className="flex min-h-11 items-center justify-between gap-3">
                          <Label>Studio name</Label>
                          <Switch
                            checked={mod.props.showName !== false}
                            onCheckedChange={(next) =>
                              patchHero(mod.id, { showName: next })
                            }
                            label="Show studio name"
                          />
                        </div>
                        <div className="flex min-h-11 items-center justify-between gap-3">
                          <Label>Book CTA</Label>
                          <Switch
                            checked={Boolean(mod.props.showCta)}
                            onCheckedChange={(next) =>
                              patchHero(mod.id, { showCta: next })
                            }
                            label="Show book CTA"
                          />
                        </div>
                      </div>
                    ) : null}
                    {mod.type === "collections" && mod.enabled ? (
                      <Field>
                        <Label htmlFor={`layout-${mod.id}`}>
                          Portfolio layout
                        </Label>
                        <Select
                          id={`layout-${mod.id}`}
                          value={layout}
                          onChange={(e) =>
                            setPortfolioLayout(
                              e.target.value as HomepageCollectionsLayout,
                            )
                          }
                        >
                          {HOMEPAGE_COLLECTIONS_LAYOUTS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        tone="ghost"
                        size="sm"
                        className="min-h-11 w-full sm:w-auto"
                        disabled={index === 0}
                        onClick={() => moveModule(index, -1)}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        tone="ghost"
                        size="sm"
                        className="min-h-11 w-full sm:w-auto"
                        disabled={index === modules.length - 1}
                        onClick={() => moveModule(index, 1)}
                      >
                        Move down
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            tone="accent"
            pending={saving}
            pendingLabel="Saving…"
            disabled={!dirty}
            className="w-full"
            onClick={() => void saveModules()}
          >
            Save modules
          </Button>
        </Card>

        <div className="order-1 min-w-0 lg:order-2">
          <DeviceFramePreview
            label="Site"
            status={
              dirty
                ? "Unsaved — live site unchanged"
                : published
                  ? "Matches live site"
                  : "Draft — not on the public site"
            }
          >
            <StudioHomepageView data={preview} bareInner preview />
          </DeviceFramePreview>
          {meta.hasPassword ? (
            <p className="mt-3 text-center text-xs text-muted">
              Site password on — visitors unlock before viewing.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
