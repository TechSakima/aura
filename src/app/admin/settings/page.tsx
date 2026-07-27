"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerListEditor } from "@/components/admin/ListEditor";
import {
  Button,
  Card,
  Field,
  FileUploadButton,
  Input,
  Label,
  PageHeader,
  Select,
  useConfirm,
  useToast,
  useUploadSession,
} from "@/components/ui";
import { resolveMediaUrl } from "@/lib/media-url";
import type {
  PrintPartner,
  WatermarkPosition,
  WatermarkPreset,
} from "@/lib/types";

export default function SettingsPage() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const uploadSession = useUploadSession();
  const [name, setName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [defaultWatermarkPresetId, setDefaultWatermarkPresetId] = useState("");
  const [printPartners, setPrintPartners] = useState<PrintPartner[]>([]);
  const [presets, setPresets] = useState<WatermarkPreset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wmName, setWmName] = useState("Studio mark");
  const [wmText, setWmText] = useState("AURA");
  const [wmMode, setWmMode] = useState<"text" | "image">("text");
  const [wmPosition, setWmPosition] =
    useState<WatermarkPosition>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState("0.35");
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmBusy, setWmBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  async function load() {
    const res = await fetch("/api/studio");
    if (!res.ok) {
      push("Could not load settings", "danger");
      return;
    }
    const data = await res.json();
    setName(data.studio.name);
    setBrandTagline(data.studio.brandTagline || "");
    setOwnerEmail(data.studio.ownerEmail || "");
    setLogoUrl(data.studio.logoUrl || "");
    setDefaultWatermarkPresetId(data.studio.defaultWatermarkPresetId || "");
    setPrintPartners(data.studio.printPartners || []);
    setPresets(data.watermarkPresets || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function resetWmForm() {
    setEditingId(null);
    setWmName("Studio mark");
    setWmText("AURA");
    setWmMode("text");
    setWmPosition("bottom-right");
    setWmOpacity("0.35");
    setWmFile(null);
  }

  function startEdit(preset: WatermarkPreset) {
    setEditingId(preset.id);
    setWmName(preset.name);
    setWmText(preset.text || "");
    setWmMode(preset.mode);
    setWmPosition(preset.position || "bottom-right");
    setWmOpacity(String(preset.opacity ?? 0.35));
    setWmFile(null);
  }

  async function saveStudio(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brandTagline,
        defaultWatermarkPresetId,
        printPartners,
      }),
    });
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    push("Settings saved", "success");
  }

  async function uploadLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    await uploadSession.runUpload({
      title: "Uploading logo",
      files: [file],
      uploadFile: async (f) => {
        const form = new FormData();
        form.set("file", f);
        const res = await fetch("/api/studio/logo", {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        setLogoUrl(data.logoUrl);
      },
    });
  }

  async function saveWatermark(e: FormEvent) {
    e.preventDefault();
    if (wmMode === "image" && !editingId && !wmFile) {
      push("Choose an image for this watermark", "danger");
      return;
    }
    setWmBusy(true);
    const form = new FormData();
    form.set("name", wmName);
    form.set("mode", wmMode);
    form.set("text", wmText);
    form.set("position", wmPosition);
    form.set("opacity", wmOpacity);
    form.set("scale", "0.14");
    if (wmFile) form.set("file", wmFile);

    const res = await fetch(
      editingId ? `/api/watermarks/${editingId}` : "/api/watermarks",
      { method: editingId ? "PATCH" : "POST", body: form },
    );
    setWmBusy(false);
    if (!res.ok) {
      push(editingId ? "Could not update watermark" : "Could not add watermark", "danger");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (editingId && data.photosUpdated != null) {
      push(
        `Watermark updated · refreshed ${data.photosUpdated} photo${
          data.photosUpdated === 1 ? "" : "s"
        }`,
        "success",
      );
    } else {
      push(editingId ? "Watermark updated" : "Watermark added", "success");
    }
    resetWmForm();
    await load();
  }

  async function deleteWatermark(preset: WatermarkPreset) {
    const ok = await confirm({
      title: "Delete watermark?",
      message: `“${preset.name}” will be removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/watermarks/${preset.id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Could not delete watermark", "danger");
      return;
    }
    if (editingId === preset.id) resetWmForm();
    if (defaultWatermarkPresetId === preset.id) {
      setDefaultWatermarkPresetId("");
    }
    push("Watermark deleted", "success");
    await load();
  }

  return (
    <div>
      {uploadSession.dialog}
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Brand, watermarks, and print partners."
        actions={
          <Button
            tone="ghost"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/admin/login");
            }}
          >
            Log out
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl">Studio</h2>
          <form onSubmit={saveStudio} className="space-y-4">
            <Field>
              <Label htmlFor="name">Studio name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <Label htmlFor="tag">Tagline</Label>
              <Input
                id="tag"
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
              />
            </Field>
            {ownerEmail ? (
              <Field>
                <Label htmlFor="email">Owner email</Label>
                <Input id="email" type="email" value={ownerEmail} disabled />
              </Field>
            ) : null}
            <Field>
              <Label>Studio logo</Label>
              {resolveMediaUrl(logoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(logoUrl)}
                  alt=""
                  className="mb-2 h-16 w-auto object-contain"
                />
              ) : null}
              <FileUploadButton
                label={logoUrl ? "Replace logo" : "Upload logo"}
                tone="neutral"
                disabled={uploadSession.busy}
                onFiles={(files) => void uploadLogo(files)}
              />
            </Field>
            <Field>
              <Label htmlFor="wm">Default watermark</Label>
              <Select
                id="wm"
                value={defaultWatermarkPresetId}
                onChange={(e) => setDefaultWatermarkPresetId(e.target.value)}
              >
                {presets.length === 0 ? (
                  <option value="">No watermarks yet</option>
                ) : (
                  presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mode})
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <PartnerListEditor partners={printPartners} onChange={setPrintPartners} />
            <Button type="submit">Save studio</Button>
          </form>
        </Card>

        <Card className="space-y-6 p-5">
          <div>
            <h2 className="font-display text-2xl">Watermarks</h2>
            <p className="mt-1 text-sm text-muted">
              Manage presets used on gallery previews.
            </p>
          </div>

          {presets.length === 0 ? (
            <p className="text-sm text-muted">No watermark presets yet.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {presets.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">
                      {p.mode}
                      {p.mode === "text" && p.text ? ` · “${p.text}”` : ""}
                      {` · ${p.position || "bottom-right"}`}
                      {defaultWatermarkPresetId === p.id ? " · Default" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" tone="ghost" onClick={() => startEdit(p)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      tone="ghost"
                      onClick={() => void deleteWatermark(p)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={saveWatermark} className="space-y-4 border-t border-line pt-5">
            <h3 className="font-display text-xl">
              {editingId ? "Edit watermark" : "Add watermark"}
            </h3>
            <Field>
              <Label htmlFor="wname">Name</Label>
              <Input id="wname" value={wmName} onChange={(e) => setWmName(e.target.value)} />
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
                <Input id="wtext" value={wmText} onChange={(e) => setWmText(e.target.value)} />
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
            <p className="text-sm text-muted">
              Saving an edit refreshes watermarked previews in galleries that
              use this preset.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={wmBusy}>
                {wmBusy
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Add preset"}
              </Button>
              {editingId ? (
                <Button type="button" tone="ghost" onClick={resetWmForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
