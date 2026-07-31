"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  FileUploadButton,
  Input,
  Label,
  Select,
  useConfirm,
  useToast,
} from "@/components/ui";
import { mutateJson } from "@/lib/client/mutation";
import {
  clampWatermarkScale,
  DEFAULT_WATERMARK_SCALE,
} from "@/lib/watermark-scale";
import type { WatermarkPosition, WatermarkPreset } from "@/lib/types";

type Props = {
  defaultWatermarkPresetId?: string;
  onPresetsChange?: (presets: WatermarkPreset[]) => void;
};

export function SettingsWatermarks({
  defaultWatermarkPresetId = "",
  onPresetsChange,
}: Props) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<WatermarkPreset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wmName, setWmName] = useState("Studio mark");
  const [wmText, setWmText] = useState("AURA");
  const [wmMode, setWmMode] = useState<"text" | "image">("text");
  const [wmPosition, setWmPosition] =
    useState<WatermarkPosition>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState("0.35");
  const [wmScale, setWmScale] = useState(String(DEFAULT_WATERMARK_SCALE));
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmBusy, setWmBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/studio");
    setLoading(false);
    if (!res.ok) {
      push("Could not load watermarks", "danger");
      return;
    }
    const data = await res.json();
    const next = (data.watermarkPresets || []) as WatermarkPreset[];
    setPresets(next);
    onPresetsChange?.(next);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#watermarks") return;
    if (loading) return;
    requestAnimationFrame(() => {
      document.getElementById("watermarks")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [loading]);

  function resetWmForm() {
    setEditingId(null);
    setWmName("Studio mark");
    setWmText("AURA");
    setWmMode("text");
    setWmPosition("bottom-right");
    setWmOpacity("0.35");
    setWmScale(String(DEFAULT_WATERMARK_SCALE));
    setWmFile(null);
  }

  function startEdit(preset: WatermarkPreset) {
    setEditingId(preset.id);
    setWmName(preset.name);
    setWmText(preset.text || "");
    setWmMode(preset.mode);
    setWmPosition(preset.position || "bottom-right");
    setWmOpacity(String(preset.opacity ?? 0.35));
    setWmScale(String(preset.scale ?? DEFAULT_WATERMARK_SCALE));
    setWmFile(null);
  }

  async function saveWatermark(e: FormEvent) {
    e.preventDefault();
    if (wmMode === "image" && !editingId && !wmFile) {
      push("Choose an image for this watermark", "danger");
      return;
    }
    setWmBusy(true);
    try {
      const form = new FormData();
      form.set("name", wmName);
      form.set("mode", wmMode);
      form.set("text", wmText);
      form.set("position", wmPosition);
      form.set("opacity", wmOpacity);
      form.set("scale", String(clampWatermarkScale(wmScale)));
      if (wmFile) form.set("file", wmFile);

      const result = await mutateJson<{
        photosUpdated?: number;
        watermarksQueued?: number;
        galleries?: number;
      }>(
        editingId ? `/api/watermarks/${editingId}` : "/api/watermarks",
        { method: editingId ? "PATCH" : "POST", body: form },
        { action: editingId ? "update watermark" : "add watermark" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const data = result.data;
      const queued = data.watermarksQueued ?? data.galleries;
      if (editingId && queued != null && queued > 0) {
        push(
          `Watermark updated · refresh queued for ${queued} ${
            queued === 1 ? "gallery" : "galleries"
          }`,
          "success",
        );
      } else {
        push(editingId ? "Watermark updated" : "Watermark added", "success");
      }
      resetWmForm();
      await load();
    } finally {
      setWmBusy(false);
    }
  }

  async function deleteWatermark(preset: WatermarkPreset) {
    const ok = await confirm({
      title: "Delete watermark?",
      message: `“${preset.name}” will be removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const result = await mutateJson(`/api/watermarks/${preset.id}`, {
      method: "DELETE",
    }, { action: "delete watermark" });
    if (!result.ok) {
      push(result.errorMessage, "danger");
      return;
    }
    if (editingId === preset.id) resetWmForm();
    push("Watermark deleted", "success");
    await load();
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading watermarks…" />;
  }

  return (
    <Card id="watermarks" className="scroll-mt-[var(--admin-scroll-mt)] min-w-0 space-y-6 p-5">
      <div>
        <h2 className="font-display text-2xl">Watermarks</h2>
        <p className="mt-1 text-sm text-muted">
          Presets for gallery previews. Choose the default above.
        </p>
      </div>

      {presets.length === 0 ? (
        <p className="text-sm text-muted">No watermark presets yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {presets.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.mode}
                  {p.mode === "text" && p.text ? ` · “${p.text}”` : ""}
                  {` · ${p.position || "bottom-right"}`}
                  {p.mode === "image"
                    ? ` · scale ${Math.round((p.scale ?? DEFAULT_WATERMARK_SCALE) * 100)}%`
                    : ""}
                  {defaultWatermarkPresetId === p.id ? " · Default" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  tone="ghost"
                  className="min-h-11"
                  onClick={() => startEdit(p)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  tone="ghost"
                  className="min-h-11"
                  onClick={() => void deleteWatermark(p)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={saveWatermark}
        className="space-y-4 border-t border-line pt-5"
      >
        <h3 className="font-display text-xl">
          {editingId ? "Edit watermark" : "Add watermark"}
        </h3>
        <Field>
          <Label htmlFor="wname">Name</Label>
          <Input
            id="wname"
            value={wmName}
            onChange={(e) => setWmName(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="mode">Mode</Label>
          <Select
            id="mode"
            value={wmMode}
            onChange={(e) => setWmMode(e.target.value as "text" | "image")}
          >
            <option value="text">Text</option>
            <option value="image">Image file</option>
          </Select>
        </Field>
        {wmMode === "text" ? (
          <Field>
            <Label htmlFor="wtext">Text</Label>
            <Input
              id="wtext"
              value={wmText}
              onChange={(e) => setWmText(e.target.value)}
            />
          </Field>
        ) : (
          <Field>
            <Label>Image (PNG/SVG)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <FileUploadButton
                label={
                  wmFile
                    ? "Change image"
                    : editingId
                      ? "Replace image"
                      : "Choose image"
                }
                tone="neutral"
                accept="image/*,.svg"
                onFiles={(files) => setWmFile(files[0] || null)}
              />
              {wmFile ? (
                <span className="text-sm text-muted">{wmFile.name}</span>
              ) : editingId ? (
                <span className="text-sm text-muted">Keeping current image</span>
              ) : null}
            </div>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="wmpos">Position</Label>
            <Select
              id="wmpos"
              value={wmPosition}
              onChange={(e) =>
                setWmPosition(e.target.value as WatermarkPosition)
              }
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="top-right">Top right</option>
              <option value="top-left">Top left</option>
              <option value="center">Center</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="wmop">Opacity</Label>
            <Input
              id="wmop"
              type="number"
              min="0.1"
              max="1"
              step="0.05"
              value={wmOpacity}
              onChange={(e) => setWmOpacity(e.target.value)}
            />
          </Field>
        </div>
        {wmMode === "image" ? (
          <Field>
            <Label htmlFor="wmscale">Scale</Label>
            <Input
              id="wmscale"
              type="number"
              min="0.05"
              max="0.5"
              step="0.01"
              value={wmScale}
              onChange={(e) => setWmScale(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Width relative to the photo (5%–50%).
            </p>
          </Field>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="submit"
            disabled={wmBusy}
            className="w-full sm:w-auto"
          >
            {wmBusy
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Add preset"}
          </Button>
          {editingId ? (
            <Button
              type="button"
              tone="ghost"
              className="w-full sm:w-auto"
              onClick={resetWmForm}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
