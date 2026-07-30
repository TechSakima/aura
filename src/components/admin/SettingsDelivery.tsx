"use client";

import { FormEvent, useEffect, useState } from "react";
import { SettingsWatermarks } from "@/components/admin/SettingsWatermarks";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
  Switch,
  useToast,
} from "@/components/ui";
import { mutateJson } from "@/lib/client/mutation";
import {
  DEFAULT_DELIVERY_DEFAULTS,
  normalizeDeliveryDefaults,
} from "@/lib/delivery-defaults";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type {
  DownloadPinPolicy,
  GalleryCoverStyle,
  GalleryGridMode,
  GalleryThemeId,
  WatermarkPreset,
} from "@/lib/types";
import { GALLERY_THEME_PRESETS } from "@/lib/themes";

export function SettingsDelivery() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [presets, setPresets] = useState<WatermarkPreset[]>([]);
  const [defaultWatermarkPresetId, setDefaultWatermarkPresetId] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(
    DEFAULT_DELIVERY_DEFAULTS.commentsEnabled,
  );
  const [watermarkEnabled, setWatermarkEnabled] = useState(
    DEFAULT_DELIVERY_DEFAULTS.watermarkEnabled,
  );
  const [expiryDays, setExpiryDays] = useState(
    String(DEFAULT_DELIVERY_DEFAULTS.expiryDays),
  );
  const [selectLimit, setSelectLimit] = useState("");
  const [downloadPinPolicy, setDownloadPinPolicy] =
    useState<DownloadPinPolicy>("required");
  const [coverStyle, setCoverStyle] = useState<GalleryCoverStyle>(
    DEFAULT_DELIVERY_DEFAULTS.coverStyle,
  );
  const [themeId, setThemeId] = useState<GalleryThemeId>(
    DEFAULT_DELIVERY_DEFAULTS.themeId,
  );
  const [gridMode, setGridMode] = useState<GalleryGridMode>(
    DEFAULT_DELIVERY_DEFAULTS.gridMode,
  );
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load delivery defaults", "danger");
        return;
      }
      const data = await res.json();
      const d = normalizeDeliveryDefaults(data.studio.deliveryDefaults);
      setPresets(data.watermarkPresets || []);
      setDefaultWatermarkPresetId(data.studio.defaultWatermarkPresetId || "");
      setCommentsEnabled(d.commentsEnabled);
      setWatermarkEnabled(d.watermarkEnabled);
      setExpiryDays(String(d.expiryDays));
      setSelectLimit(d.selectLimit != null ? String(d.selectLimit) : "");
      setDownloadPinPolicy(d.downloadPinPolicy);
      setCoverStyle(d.coverStyle);
      setThemeId(d.themeId);
      setGridMode(d.gridMode);
      setDirty(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  function markDirty() {
    setDirty(true);
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const deliveryDefaults = normalizeDeliveryDefaults({
        commentsEnabled,
        watermarkEnabled,
        expiryDays: Number(expiryDays),
        selectLimit: selectLimit.trim() === "" ? null : Number(selectLimit),
        downloadPinPolicy,
        coverStyle,
        themeId,
        gridMode,
      });
      const result = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "delivery",
            defaultWatermarkPresetId,
            deliveryDefaults: {
              ...deliveryDefaults,
              selectLimit:
                selectLimit.trim() === "" ? null : deliveryDefaults.selectLimit,
            },
          }),
        },
        { action: "save" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      setExpiryDays(String(deliveryDefaults.expiryDays));
      setSelectLimit(
        deliveryDefaults.selectLimit != null
          ? String(deliveryDefaults.selectLimit)
          : "",
      );
      setDirty(false);
      push("Delivery defaults saved", "success");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading delivery…" />;
  }

  return (
    <div className="space-y-4">
    <Card className="min-w-0 p-5">
      <div className="mb-6 min-w-0">
        <h2 className="font-display text-2xl">Delivery defaults</h2>
        <p className="mt-1 text-sm text-muted">
          Applied to new galleries. Per-gallery overrides stay in Delivery.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Field>
          <Label htmlFor="dd-wm">Default watermark</Label>
          <Select
            id="dd-wm"
            value={defaultWatermarkPresetId}
            onChange={(e) => {
              setDefaultWatermarkPresetId(e.target.value);
              markDirty();
            }}
          >
            <option value="">None</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.mode})
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex min-h-11 items-center justify-between gap-3">
          <Label htmlFor="dd-wm-on">Watermark on by default</Label>
          <Switch
            id="dd-wm-on"
            label="Watermark on by default"
            checked={watermarkEnabled}
            onCheckedChange={(next) => {
              setWatermarkEnabled(next);
              markDirty();
            }}
          />
        </div>

        <div className="flex min-h-11 items-center justify-between gap-3">
          <Label htmlFor="dd-comments">Comments on by default</Label>
          <Switch
            id="dd-comments"
            label="Comments on by default"
            checked={commentsEnabled}
            onCheckedChange={(next) => {
              setCommentsEnabled(next);
              markDirty();
            }}
          />
        </div>

        <Field>
          <Label htmlFor="dd-expiry">Expiry (days)</Label>
          <Input
            id="dd-expiry"
            inputMode="numeric"
            value={expiryDays}
            onChange={(e) => {
              setExpiryDays(e.target.value.replace(/\D/g, "").slice(0, 4));
              markDirty();
            }}
          />
        </Field>

        <Field>
          <Label htmlFor="dd-select">Select limit</Label>
          <Input
            id="dd-select"
            inputMode="numeric"
            value={selectLimit}
            placeholder="No limit"
            onChange={(e) => {
              setSelectLimit(e.target.value.replace(/\D/g, "").slice(0, 5));
              markDirty();
            }}
          />
        </Field>

        <Field>
          <Label htmlFor="dd-pin">Download PIN</Label>
          <Select
            id="dd-pin"
            value={downloadPinPolicy}
            onChange={(e) => {
              setDownloadPinPolicy(e.target.value as DownloadPinPolicy);
              markDirty();
            }}
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="dd-cover">Cover treatment</Label>
          <Select
            id="dd-cover"
            value={coverStyle}
            onChange={(e) => {
              setCoverStyle(e.target.value as GalleryCoverStyle);
              markDirty();
            }}
          >
            <option value="full">Full</option>
            <option value="third">Third</option>
            <option value="none">None</option>
            <option value="immersive">Immersive</option>
            <option value="split-title">Split title</option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="dd-theme">Design preset</Label>
          <Select
            id="dd-theme"
            value={themeId}
            onChange={(e) => {
              setThemeId(e.target.value as GalleryThemeId);
              markDirty();
            }}
          >
            {GALLERY_THEME_PRESETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="dd-grid">Photo layout</Label>
          <Select
            id="dd-grid"
            value={gridMode}
            onChange={(e) => {
              setGridMode(e.target.value as GalleryGridMode);
              markDirty();
            }}
          >
            <option value="masonry">Masonry</option>
            <option value="justified">Justified</option>
            <option value="columns">Columns</option>
            <option value="diary">Diary</option>
          </Select>
        </Field>

        <Button
          type="submit"
          pending={saving}
          pendingLabel="Saving…"
          className="w-full sm:w-auto"
        >
          Save delivery defaults
        </Button>
      </form>
    </Card>

    <SettingsWatermarks
      defaultWatermarkPresetId={defaultWatermarkPresetId}
      onPresetsChange={setPresets}
    />
    </div>
  );
}
