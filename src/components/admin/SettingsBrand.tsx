"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  EmptyState,
  Field,
  FileUploadButton,
  Input,
  Label,
  SegmentedControl,
  ThemeSwatch,
  TypePairingSwatch,
  useToast,
  useUploadSession,
} from "@/components/ui";
import { normalizeBrandKit } from "@/lib/brand-kit";
import { mutateJson } from "@/lib/client/mutation";
import { resolveMediaUrl } from "@/lib/media-url";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type {
  BrandLogoVariants,
  BrandSocialTreatment,
  StudioBrandKit,
} from "@/lib/types";
import {
  FONT_PRESETS,
  STUDIO_THEME_PRESETS,
  resolveStudioThemePreset,
  studioThemeFromPreset,
} from "@/lib/themes";

type LogoSlot = keyof BrandLogoVariants;

const LOGO_SLOTS: {
  key: LogoSlot;
  kind: "mark" | "wordmark" | "lockup" | "cover";
  label: string;
  upload: string;
  replace: string;
}[] = [
  {
    key: "markUrl",
    kind: "mark",
    label: "Mark",
    upload: "Upload mark",
    replace: "Replace mark",
  },
  {
    key: "wordmarkUrl",
    kind: "wordmark",
    label: "Wordmark",
    upload: "Upload wordmark",
    replace: "Replace wordmark",
  },
  {
    key: "lockupUrl",
    kind: "lockup",
    label: "Lockup",
    upload: "Upload lockup",
    replace: "Replace lockup",
  },
  {
    key: "invertedUrl",
    kind: "cover",
    label: "Inverted",
    upload: "Upload inverted",
    replace: "Replace inverted",
  },
];

export function SettingsBrand() {
  const router = useRouter();
  const { push } = useToast();
  const uploadSession = useUploadSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandKit, setBrandKit] = useState<StudioBrandKit | null>(null);
  const [socialLinks, setSocialLinks] = useState<
    { label: string; url: string }[]
  >([]);
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load brand", "danger");
        return;
      }
      const data = await res.json();
      const kit = normalizeBrandKit(
        data.studio.brandKit,
        data.studio,
      );
      setName(data.studio.name || "");
      setBrandTagline(data.studio.brandTagline || "");
      setBrandKit(kit);
      setSocialLinks(data.studio.socialLinks || []);
      setDirty(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  const themePreset = resolveStudioThemePreset(
    brandKit
      ? {
          presetId: brandKit.basePresetId,
          background: brandKit.background,
          accent: brandKit.accent,
          fontPreset: brandKit.fonts.pairingId,
        }
      : null,
  );

  function patchKit(patch: Partial<StudioBrandKit>) {
    setBrandKit((prev) => {
      if (!prev) return prev;
      return normalizeBrandKit({ ...prev, ...patch }, undefined);
    });
    setDirty(true);
  }

  function patchLogos(patch: Partial<BrandLogoVariants>) {
    setBrandKit((prev) => {
      if (!prev) return prev;
      const logos = { ...prev.logos };
      for (const [k, v] of Object.entries(patch) as [LogoSlot, string | undefined][]) {
        if (v) logos[k] = v;
        else delete logos[k];
      }
      return { ...prev, logos };
    });
    setDirty(true);
  }

  async function uploadBrandAsset(
    files: File[],
    kind: "mark" | "wordmark" | "lockup" | "cover" | "og",
  ) {
    const file = files[0];
    if (!file) return;
    const title =
      kind === "og"
        ? "Uploading cover image"
        : kind === "cover"
          ? "Uploading inverted logo"
          : `Uploading ${kind}`;
    await uploadSession.runUpload({
      title,
      files: [file],
      uploadFile: async (f) => {
        const form = new FormData();
        form.set("file", f);
        form.set("kind", kind);
        const res = await fetch("/api/studio/logo", {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        if (kind === "og") {
          patchKit({ coverImageUrl: data.coverImageUrl || data.defaultCoverImageUrl || "" });
        } else if (kind === "cover") {
          patchLogos({ invertedUrl: data.invertedUrl || data.coverLogoUrl || "" });
        } else if (kind === "mark") {
          patchLogos({ markUrl: data.markUrl || "" });
        } else if (kind === "wordmark") {
          patchLogos({ wordmarkUrl: data.wordmarkUrl || "" });
        } else {
          patchLogos({ lockupUrl: data.lockupUrl || data.logoUrl || "" });
        }
      },
    });
  }

  async function removeLogoSlot(slot: LogoSlot) {
    const legacyField =
      slot === "lockupUrl"
        ? "logoUrl"
        : slot === "invertedUrl"
          ? "coverLogoUrl"
          : null;
    const nextLogos = { ...(brandKit?.logos || {}) };
    delete nextLogos[slot];
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "brand",
        brandKit: brandKit
          ? { ...brandKit, logos: nextLogos }
          : { logos: nextLogos },
        ...(legacyField ? { [legacyField]: "" } : {}),
      }),
    });
    if (!res.ok) {
      push("Could not remove image", "danger");
      return;
    }
    patchLogos({ [slot]: undefined });
    push("Removed", "success");
  }

  async function removeCoverImage() {
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "brand",
        defaultCoverImageUrl: "",
        brandKit: brandKit
          ? { ...brandKit, coverImageUrl: undefined }
          : undefined,
      }),
    });
    if (!res.ok) {
      push("Could not remove image", "danger");
      return;
    }
    patchKit({ coverImageUrl: undefined });
    push("Cover image removed", "success");
  }

  function selectThemeKit(presetId: string) {
    const preset =
      STUDIO_THEME_PRESETS.find((p) => p.id === presetId) ||
      STUDIO_THEME_PRESETS[0]!;
    patchKit({
      basePresetId: preset.id,
      background: preset.background,
      accent: preset.accent,
      accentSecondary: preset.accentSecondary || preset.muted,
      fonts: { pairingId: preset.fontPreset },
    });
  }

  async function saveBrand(e: FormEvent) {
    e.preventDefault();
    if (!brandKit) return;
    setSaving(true);
    try {
      const preset = resolveStudioThemePreset({
        presetId: brandKit.basePresetId,
        background: brandKit.background,
        accent: brandKit.accent,
        fontPreset: brandKit.fonts.pairingId,
      });
      const result = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "brand",
            name,
            brandTagline,
            socialLinks,
            brandKit,
            theme: studioThemeFromPreset(preset, brandKit.fonts.pairingId),
          }),
        },
        { action: "save" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      setDirty(false);
      push("Brand saved", "success");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading || !brandKit) {
    return <EmptyState variant="loading" title="Loading brand…" />;
  }

  return (
    <div>
      {uploadSession.dialog}
      <Card className="min-w-0 p-5">
        <h2 className="mb-1 font-display text-2xl">Brand</h2>
        <p className="mb-4 text-sm text-muted">
          Brand kit: logos, starting theme, type, and social.
        </p>
        <form onSubmit={saveBrand} className="space-y-6">
          <Field>
            <Label htmlFor="brand-name">Studio name</Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <Field>
            <Label htmlFor="brand-tag">Tagline</Label>
            <Input
              id="brand-tag"
              value={brandTagline}
              onChange={(e) => {
                setBrandTagline(e.target.value);
                setDirty(true);
              }}
            />
          </Field>

          <div className="space-y-4">
            <Label>Logos</Label>
            {LOGO_SLOTS.map((slot) => {
              const url = brandKit.logos[slot.key] || "";
              return (
                <Field key={slot.key}>
                  <Label>{slot.label}</Label>
                  {resolveMediaUrl(url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(url)}
                      alt=""
                      className="mb-2 h-16 w-auto object-contain"
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <FileUploadButton
                      label={url ? slot.replace : slot.upload}
                      tone="neutral"
                      disabled={uploadSession.busy}
                      onFiles={(files) => void uploadBrandAsset(files, slot.kind)}
                    />
                    {url ? (
                      <Button
                        type="button"
                        tone="ghost"
                        className="min-h-11 w-full sm:w-auto"
                        onClick={() => void removeLogoSlot(slot.key)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </Field>
              );
            })}
          </div>

          <Field>
            <Label>Cover image</Label>
            {resolveMediaUrl(brandKit.coverImageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(brandKit.coverImageUrl)}
                alt=""
                className="mb-2 aspect-[1.91/1] w-full max-w-md object-cover"
              />
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <FileUploadButton
                label={
                  brandKit.coverImageUrl
                    ? "Replace cover image"
                    : "Upload cover image"
                }
                tone="neutral"
                disabled={uploadSession.busy}
                onFiles={(files) => void uploadBrandAsset(files, "og")}
              />
              {brandKit.coverImageUrl ? (
                <Button
                  type="button"
                  tone="ghost"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => void removeCoverImage()}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </Field>

          <div className="space-y-3">
            <Label>Starting kit</Label>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">
                  Light
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STUDIO_THEME_PRESETS.filter((p) => p.mode === "light").map(
                    (p) => (
                      <ThemeSwatch
                        key={p.id}
                        theme={p}
                        selected={themePreset.id === p.id}
                        onSelect={() => selectThemeKit(p.id)}
                      />
                    ),
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">
                  Dark
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STUDIO_THEME_PRESETS.filter((p) => p.mode === "dark").map(
                    (p) => (
                      <ThemeSwatch
                        key={p.id}
                        theme={p}
                        selected={themePreset.id === p.id}
                        onSelect={() => selectThemeKit(p.id)}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span
                  className="size-8 rounded-md border border-line"
                  style={{ background: brandKit.accent }}
                  aria-hidden
                />
                <span className="text-xs text-muted">Accent</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="size-8 rounded-md border border-line"
                  style={{ background: brandKit.accentSecondary }}
                  aria-hidden
                />
                <span className="text-xs text-muted">Secondary</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Typography</Label>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
              role="group"
              aria-label="Typography"
            >
              {FONT_PRESETS.map((pairing) => (
                <TypePairingSwatch
                  key={pairing.id}
                  pairing={pairing}
                  selected={brandKit.fonts.pairingId === pairing.id}
                  onSelect={() => {
                    patchKit({ fonts: { pairingId: pairing.id } });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Social treatment</Label>
            <SegmentedControl
              ariaLabel="Social treatment"
              value={brandKit.socialTreatment}
              onChange={(id) => {
                patchKit({ socialTreatment: id as BrandSocialTreatment });
              }}
              options={[
                { id: "text", label: "Text" },
                { id: "icons", label: "Icons" },
                { id: "pills", label: "Pills" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <Label>Social links</Label>
            {socialLinks.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
              >
                <Input
                  value={row.label}
                  onChange={(e) => {
                    setSocialLinks((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, label: e.target.value } : r,
                      ),
                    );
                    setDirty(true);
                  }}
                  placeholder="Instagram"
                />
                <Input
                  value={row.url}
                  onChange={(e) => {
                    setSocialLinks((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, url: e.target.value } : r,
                      ),
                    );
                    setDirty(true);
                  }}
                  placeholder="https://instagram.com/…"
                />
                <Button
                  type="button"
                  tone="ghost"
                  className="min-h-11"
                  onClick={() => {
                    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
                    setDirty(true);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              tone="neutral"
              className="min-h-11"
              onClick={() => {
                setSocialLinks((prev) => [...prev, { label: "", url: "" }]);
                setDirty(true);
              }}
            >
              Add social link
            </Button>
          </div>

          <Button
            type="submit"
            pending={saving}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            Save brand
          </Button>
        </form>
      </Card>
    </div>
  );
}
