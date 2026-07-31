"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { WebsiteReadinessChecklist } from "@/components/admin/WebsiteReadinessChecklist";
import { primaryLogoFromKit } from "@/lib/brand-kit";
import { mutateJson } from "@/lib/client/mutation";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import { resolveMediaUrl } from "@/lib/media-url";
import { studioShareCardFromBrand } from "@/lib/share-card";
import { websiteReadinessItems } from "@/lib/website-readiness";
import type { Studio, StudioBrandKit, StudioHomepageModule } from "@/lib/types";

type GalleryRow = {
  id: string;
  title: string;
  status: string;
  showOnHomepage?: boolean;
};

export function SettingsWebsite() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [biography, setBiography] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [clearPassword, setClearPassword] = useState(false);
  const [showBiography, setShowBiography] = useState(true);
  const [showSocialLinks, setShowSocialLinks] = useState(true);
  const [showWebsite, setShowWebsite] = useState(false);
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [sortOrder, setSortOrder] = useState<
    "created_desc" | "created_asc" | "title_asc"
  >("created_desc");
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [studioName, setStudioName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandKit, setBrandKit] = useState<StudioBrandKit | null>(null);
  const [defaultCoverImageUrl, setDefaultCoverImageUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [readinessStudio, setReadinessStudio] = useState<Studio | null>(null);
  const [modules, setModules] = useState<StudioHomepageModule[]>([]);
  const [bookingReady, setBookingReady] = useState(false);
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [studioRes, galleriesRes, typesRes] = await Promise.all([
        fetch("/api/studio"),
        fetch("/api/galleries?options=1"),
        fetch("/api/bookings/session-types?view=requests"),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!studioRes.ok) {
        push("Could not load website settings", "danger");
        return;
      }
      const data = await studioRes.json();
      const studio = data.studio || {};
      const hp = studio.homepage || {};
      setStudioName(studio.name || "");
      setBrandTagline(studio.brandTagline || "");
      setBrandKit(studio.brandKit || null);
      setDefaultCoverImageUrl(studio.defaultCoverImageUrl || "");
      setLogoUrl(studio.logoUrl || "");
      setReadinessStudio(studio as Studio);
      setModules(Array.isArray(hp.modules) ? hp.modules : []);
      setEnabled(Boolean(hp.enabled));
      setSlug(hp.slug || "");
      setBiography(hp.biography || "");
      setHasPassword(Boolean(hp.hasPassword));
      setPassword("");
      setClearPassword(false);
      setShowBiography(hp.showBiography !== false);
      setShowSocialLinks(hp.showSocialLinks !== false);
      setShowWebsite(Boolean(hp.showWebsite));
      setShowEmail(hp.showEmail !== false);
      setShowPhone(hp.showPhone !== false);
      setShowAddress(hp.showAddress !== false);
      setShowContactForm(Boolean(hp.showContactForm));
      setSortOrder(hp.sortOrder || "created_desc");
      if (galleriesRes.ok) {
        const gData = await galleriesRes.json();
        setGalleries(gData.galleries || []);
      }
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        const types = Array.isArray(typesData.sessionTypes)
          ? typesData.sessionTypes
          : [];
        setBookingReady(
          types.some((t: { active?: boolean }) => t.active !== false) &&
            Boolean(String(hp.slug || "").trim()),
        );
      }
      setDirty(false);
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash === "#featured" || hash === "#contact") {
          requestAnimationFrame(() => {
            document.getElementById(hash.slice(1))?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  function markDirty() {
    setDirty(true);
  }

  async function saveWebsite(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const result = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "website",
            homepage: {
              enabled,
              slug,
              biography,
              showBiography,
              showSocialLinks,
              showWebsite,
              showEmail,
              showPhone,
              showAddress,
              showContactForm,
              sortOrder,
              ...(password.trim() ? { password: password.trim() } : {}),
              ...(clearPassword ? { clearPassword: true } : {}),
            },
          }),
        },
        { action: "save" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      setDirty(false);
      setPassword("");
      setClearPassword(false);
      if (password.trim() || clearPassword) {
        setHasPassword(clearPassword ? false : true);
      }
      push(enabled ? "Website saved" : "Website saved to draft", "success");
    } finally {
      setSaving(false);
    }
  }

  async function toggleGallery(id: string, show: boolean) {
    setGalleries((prev) =>
      prev.map((g) => (g.id === id ? { ...g, showOnHomepage: show } : g)),
    );
    const result = await mutateJson(
      `/api/galleries/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnHomepage: show }),
      },
      { action: "update" },
    );
    if (!result.ok) {
      push(result.errorMessage, "danger");
      const gRes = await fetch("/api/galleries?options=1");
      if (gRes.ok) {
        const gData = await gRes.json();
        setGalleries(gData.galleries || []);
      }
      return;
    }
    push(show ? "Shown on website" : "Hidden from website", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading website…" />;
  }

  const shareCard = studioShareCardFromBrand({
    name: studioName,
    brandTagline,
    brandKit: brandKit || undefined,
    defaultCoverImageUrl: defaultCoverImageUrl || undefined,
    logoUrl: logoUrl || undefined,
    biography,
  });
  const shareImage = resolveMediaUrl(shareCard.imageSrc);
  const shareLogoFallback = resolveMediaUrl(
    (brandKit ? primaryLogoFromKit(brandKit.logos) : undefined) || logoUrl,
  );
  const readinessItems = readinessStudio
    ? websiteReadinessItems({
        studio: readinessStudio,
        modules,
        bookingReady,
      })
    : [];

  return (
    <div className="space-y-6">
      <WebsiteReadinessChecklist items={readinessItems} />
    <Card className="min-w-0 p-5">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl">Website</h2>
            <Badge tone={enabled ? "success" : "neutral"}>
              {enabled ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Public site for collections and booking.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <ButtonLink
            href="/admin/website"
            tone="accent"
            className="w-full sm:w-auto"
          >
            Site builder
          </ButtonLink>
          <ButtonLink
            href="/admin/website/preview"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Preview
          </ButtonLink>
          {enabled && slug ? (
            <Button
              type="button"
              tone="neutral"
              className="w-full sm:w-auto"
              onClick={() => window.open(`/h/${slug}`, "_blank", "noopener")}
            >
              View live site
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={saveWebsite} className="space-y-6">
        <div className="space-y-3 border-b border-line pb-6">
          <Label>Share card</Label>
          <div className="overflow-hidden border border-line bg-surface">
            <div className="aspect-[1.91/1] w-full max-w-md bg-line">
              {shareImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shareImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : shareLogoFallback ? (
                <div className="flex h-full items-center justify-center bg-canvas p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shareLogoFallback}
                    alt=""
                    className="max-h-16 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center bg-canvas px-4">
                  <p className="text-center text-xs text-muted">
                    Add a cover image in Brand
                  </p>
                </div>
              )}
            </div>
            <div className="max-w-md space-y-1 border-t border-line px-4 py-3">
              <p className="truncate text-sm font-medium text-ink">
                {shareCard.title}
              </p>
              <p className="line-clamp-2 text-xs text-muted">
                {shareCard.description || "Add a tagline in Brand"}
              </p>
              <p className="truncate text-[10px] uppercase tracking-wider text-muted">
                {slug ? `/h/${slug}` : "Set a site URL"}
              </p>
            </div>
          </div>
          <ButtonLink
            href="/admin/settings/brand"
            tone="ghost"
            className="min-h-11 w-full sm:w-auto"
          >
            Edit in Brand
          </ButtonLink>
        </div>

        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="site-on">Published</Label>
            <p className="text-xs text-muted">
              On: visitors can open /h. Off: draft only.
            </p>
          </div>
          <Switch
            id="site-on"
            label="Published"
            checked={enabled}
            onCheckedChange={(next) => {
              setEnabled(next);
              markDirty();
            }}
          />
        </div>

        <Field>
          <Label htmlFor="site-slug">Site URL</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="site-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.trim().toLowerCase());
                markDirty();
              }}
              className="min-w-0 w-full flex-1"
              placeholder="your-studio"
              autoComplete="off"
            />
            <Button
              type="button"
              tone="neutral"
              disabled={!slug}
              className="w-full sm:w-auto"
              onClick={async () => {
                const url = `${window.location.origin}/h/${slug}`;
                try {
                  await navigator.clipboard.writeText(url);
                  push("Link copied", "success");
                } catch {
                  push("Could not copy", "danger");
                }
              }}
            >
              Copy link
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted">/h/{slug || "…"}</p>
        </Field>

        <Field>
          <Label htmlFor="site-password">Site password</Label>
          <Input
            id="site-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (e.target.value) setClearPassword(false);
              markDirty();
            }}
            placeholder={hasPassword ? "••••••••" : "Optional"}
            autoComplete="new-password"
          />
          {hasPassword ? (
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-muted">
              <Checkbox
                checked={clearPassword}
                onChange={(e) => {
                  setClearPassword(e.target.checked);
                  if (e.target.checked) setPassword("");
                  markDirty();
                }}
              />
              Remove password
            </label>
          ) : null}
        </Field>

        <Field>
          <Label htmlFor="site-bio">Biography</Label>
          <Textarea
            id="site-bio"
            value={biography}
            maxLength={500}
            rows={4}
            onChange={(e) => {
              setBiography(e.target.value);
              markDirty();
            }}
          />
          <p className="mt-1 text-xs text-muted">{biography.length}/500</p>
        </Field>

        <div>
          <Label>Contact details on site</Label>
          <ul className="mt-2 space-y-1 text-sm">
            {(
              [
                ["web", "Website", showWebsite, setShowWebsite],
                ["email", "Contact email", showEmail, setShowEmail],
                ["phone", "Phone number", showPhone, setShowPhone],
                ["addr", "Business address", showAddress, setShowAddress],
              ] as const
            ).map(([key, label, checked, setter]) => (
              <li key={key}>
                <label className="flex min-h-11 items-center gap-2">
                  <Checkbox
                    checked={checked}
                    onChange={(e) => {
                      setter(e.target.checked);
                      markDirty();
                    }}
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Biography, social, and section order live in Site builder.
          </p>
          <ButtonLink
            href="/admin/settings/booking"
            tone="ghost"
            className="mt-2 w-full sm:w-auto"
          >
            Book button & session types
          </ButtonLink>
        </div>

        <Field>
          <Label htmlFor="site-sort">Collection sort</Label>
          <Select
            id="site-sort"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(
                e.target.value as
                  | "created_desc"
                  | "created_asc"
                  | "title_asc",
              );
              markDirty();
            }}
          >
            <option value="created_desc">Date created: New to Old</option>
            <option value="created_asc">Date created: Old to New</option>
            <option value="title_asc">Title: A to Z</option>
          </Select>
        </Field>

        <div
          id="contact"
          className="scroll-mt-[var(--admin-scroll-mt)] space-y-3 border-t border-line pt-6"
        >
          <Label>Contact form</Label>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p className="text-sm text-muted">Show on website</p>
            <Switch
              id="site-contact-form"
              label="Contact form on website"
              checked={showContactForm}
              onCheckedChange={(next) => {
                setShowContactForm(next);
                markDirty();
              }}
            />
          </div>
          <ButtonLink
            href="/admin/settings/notifications#contact"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Contact delivery prefs
          </ButtonLink>
        </div>

        <div id="featured" className="scroll-mt-[var(--admin-scroll-mt)] space-y-3">
          <Label>Featured collections</Label>
          <p className="text-xs text-muted">
            Live galleries on the public site portfolio.
          </p>
          {galleries.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">No live galleries.</p>
              <ButtonLink
                href="/admin/galleries"
                tone="ghost"
                size="sm"
                className="min-h-11"
              >
                Open galleries
              </ButtonLink>
            </div>
          ) : (
            <ul className="space-y-2">
              {galleries.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-col gap-2 border border-line px-3 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{g.title}</p>
                    <p className="text-xs text-muted">{g.status}</p>
                  </div>
                  <div className="flex min-h-11 flex-wrap items-center gap-3">
                    <label className="inline-flex min-h-11 items-center gap-2">
                      <Switch
                        checked={Boolean(g.showOnHomepage)}
                        disabled={g.status !== "live"}
                        label={`Feature ${g.title}`}
                        onCheckedChange={(next) =>
                          void toggleGallery(g.id, next)
                        }
                      />
                      Feature
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button
          type="submit"
          pending={saving}
          pendingLabel="Saving…"
          className="w-full sm:w-auto"
        >
          Save website
        </Button>
      </form>
    </Card>
    </div>
  );
}
