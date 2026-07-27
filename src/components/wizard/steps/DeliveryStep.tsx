"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Button,
  EmptyState,
  Field,
  FileUploadButton,
  Input,
  Label,
  Select,
  Switch,
  useConfirm,
  useToast,
  useUploadSession,
} from "@/components/ui";
import { GalleryDesignPanel } from "@/components/admin/GalleryDesignPanel";
import type { Shoot, WatermarkPreset } from "@/lib/types";
import type { WizardGallery, WizardPhoto } from "@/components/wizard/useShootWizard";

export function DeliveryStep({
  shoot,
  clientName,
  gallery,
  photos,
  watermarkPresets,
  onChanged,
}: {
  shoot: Shoot;
  clientName: string;
  gallery: WizardGallery | null;
  photos: WizardPhoto[];
  watermarkPresets: WatermarkPreset[];
  onChanged: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const uploadSession = useUploadSession();
  const [title, setTitle] = useState(`${clientName} gallery`);
  const [pin, setPin] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"photos" | "design">("photos");

  const peekPhotos = useMemo(
    () => photos.filter((p) => p.kind === "peek"),
    [photos],
  );
  const videoPhotos = useMemo(
    () => photos.filter((p) => p.kind === "video"),
    [photos],
  );
  const mainPhotos = useMemo(
    () => photos.filter((p) => p.kind === "main" || (!["peek", "video"].includes(p.kind))),
    [photos],
  );

  async function createGallery(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      push("Choose a 4-digit download PIN", "danger");
      return;
    }
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shootId: shoot.id,
        title,
        pin,
        goLive: false,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      push(data.error || "Could not create gallery", "danger");
      return;
    }
    push("Gallery created", "success");
    await onChanged();
  }

  async function uploadFiles(kind: "main" | "peek" | "video", files: File[]) {
    if (!gallery || !files.length) return;
    await uploadSession.runUpload({
      title:
        kind === "peek"
          ? "Uploading sneak peek"
          : kind === "video"
            ? "Uploading video"
            : "Uploading photos",
      files,
      uploadFile: async (file) => {
        const form = new FormData();
        form.set("kind", kind);
        form.append("files", file);
        const res = await fetch(`/api/galleries/${gallery.id}/upload`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }
      },
    });
    await onChanged();
  }

  async function patch(body: Record<string, unknown>) {
    if (!gallery) return;
    const watermarkTouch =
      "watermarkEnabled" in body || "watermarkPresetId" in body;
    if (watermarkTouch) push("Refreshing watermarks…", "neutral");
    const res = await fetch(`/api/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      push(data.error || "Update failed", "danger");
      return;
    }
    if (watermarkTouch) push("Watermark previews updated", "success");
    await onChanged();
  }

  async function refreshWatermarks() {
    if (!gallery) return;
    push("Refreshing watermarks…", "neutral");
    const res = await fetch(
      `/api/galleries/${gallery.id}/reprocess-watermarks`,
      { method: "POST" },
    );
    if (!res.ok) {
      push("Could not refresh watermarks", "danger");
      return;
    }
    const data = await res.json().catch(() => ({}));
    push(
      `Watermarks refreshed (${data.updated ?? 0} photos)`,
      "success",
    );
    await onChanged();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: WizardPhoto[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of group) {
        if (on) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  async function deleteIds(ids: string[]) {
    if (!ids.length) return;
    const ok = await confirm({
      title: ids.length === 1 ? "Delete photo?" : `Delete ${ids.length} photos?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    const res = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setDeleting(false);
    if (!res.ok) {
      push("Could not delete photos", "danger");
      return;
    }
    setSelected(new Set());
    push(ids.length === 1 ? "Photo deleted" : "Photos deleted", "success");
    await onChanged();
  }

  if (!gallery) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl">Delivery</h2>
          <p className="mt-1 text-sm text-muted">
            Create the client gallery, set a download PIN, then upload photos.
          </p>
        </div>
        <form onSubmit={createGallery} className="max-w-md space-y-4">
          <Field>
            <Label>Gallery title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field>
            <Label>Download PIN (4 digits)</Label>
            <Input
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
          </Field>
          <Button type="submit">Create gallery</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {uploadSession.dialog}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Delivery</h2>
          <p className="mt-1 text-sm text-muted">
            {gallery.title} · {gallery.status} · {photos.length} photos
          </p>
          <a
            href={`/g/${gallery.publicToken}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-accent"
          >
            Open public gallery
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            tone={tab === "photos" ? "accent" : "ghost"}
            onClick={() => setTab("photos")}
          >
            Photos
          </Button>
          <Button
            size="sm"
            tone={tab === "design" ? "accent" : "ghost"}
            onClick={() => setTab("design")}
          >
            Layout
          </Button>
          <FileUploadButton
            label="Upload gallery"
            multiple
            disabled={uploadSession.busy}
            onFiles={(files) => void uploadFiles("main", files)}
          />
          <FileUploadButton
            label="Upload sneak peek"
            multiple
            tone="neutral"
            disabled={uploadSession.busy}
            onFiles={(files) => void uploadFiles("peek", files)}
          />
          <FileUploadButton
            label="Upload video"
            accept="video/*"
            multiple
            tone="neutral"
            disabled={uploadSession.busy}
            onFiles={(files) => void uploadFiles("video", files)}
          />
          {gallery.status === "draft" ? (
            <Button
              onClick={async () => {
                await patch({ goLive: true });
                push("Gallery is live", "success");
              }}
            >
              Go live
            </Button>
          ) : null}
        </div>
      </div>

      {tab === "design" ? (
        <GalleryDesignPanel
          design={gallery.design}
          showOnHomepage={gallery.showOnHomepage}
          coverPhotoUrl={gallery.coverPhotoUrl}
          onSave={async (body) => {
            await patch(body);
            push("Design saved", "success");
          }}
        />
      ) : null}

      {tab === "photos" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-y border-line py-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch
                checked={gallery.commentsEnabled}
                onCheckedChange={(v) => void patch({ commentsEnabled: v })}
                label="Comments"
              />
              Comments
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch
                checked={gallery.watermarkEnabled}
                onCheckedChange={(v) => void patch({ watermarkEnabled: v })}
                label="Watermark"
              />
              Watermark
            </label>
            <Field className="min-w-[10rem]">
              <Label>Watermark preset</Label>
              <Select
                value={gallery.watermarkPresetId || ""}
                onChange={(e) => void patch({ watermarkPresetId: e.target.value })}
              >
                <option value="">Studio default</option>
                {watermarkPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              size="sm"
              tone="ghost"
              type="button"
              onClick={() => void refreshWatermarks()}
            >
              Refresh watermarks
            </Button>
            <Field className="min-w-[8rem]">
              <Label>PIN</Label>
              <div className="flex gap-2">
                <Input
                  value={resetPin}
                  maxLength={4}
                  placeholder="####"
                  onChange={(e) =>
                    setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
                <Button
                  size="sm"
                  tone="neutral"
                  onClick={async () => {
                    if (!/^\d{4}$/.test(resetPin)) {
                      push("PIN must be 4 digits", "danger");
                      return;
                    }
                    await patch({ pin: resetPin });
                    setResetPin("");
                    push("PIN updated", "success");
                  }}
                >
                  Save
                </Button>
              </div>
            </Field>
          </div>

          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-line/30 px-3 py-2">
              <span className="text-sm">{selected.size} selected</span>
              <Button
                size="sm"
                tone="danger"
                disabled={deleting}
                onClick={() => void deleteIds([...selected])}
              >
                Delete selected
              </Button>
              <Button
                size="sm"
                tone="ghost"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          ) : null}

          {photos.length === 0 ? (
            <EmptyState
              title="No photos yet"
              description="Upload gallery, sneak peek, or video."
            />
          ) : (
            <div className="space-y-8">
              <PhotoGroup
                title="Sneak peek"
                photos={peekPhotos}
                selected={selected}
                onToggle={toggleSelect}
                onToggleAll={(on) => toggleGroup(peekPhotos, on)}
                onDeleteOne={(id) => void deleteIds([id])}
                deleting={deleting}
              />
              <PhotoGroup
                title="Gallery"
                photos={mainPhotos}
                selected={selected}
                onToggle={toggleSelect}
                onToggleAll={(on) => toggleGroup(mainPhotos, on)}
                onDeleteOne={(id) => void deleteIds([id])}
                deleting={deleting}
              />
              <PhotoGroup
                title="Video"
                photos={videoPhotos}
                selected={selected}
                onToggle={toggleSelect}
                onToggleAll={(on) => toggleGroup(videoPhotos, on)}
                onDeleteOne={(id) => void deleteIds([id])}
                deleting={deleting}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PhotoGroup({
  title,
  photos,
  selected,
  onToggle,
  onToggleAll,
  onDeleteOne,
  deleting,
}: {
  title: string;
  photos: WizardPhoto[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  onDeleteOne: (id: string) => void;
  deleting: boolean;
}) {
  if (photos.length === 0) {
    return (
      <section>
        <h3 className="font-display text-xl">{title}</h3>
        <p className="mt-1 text-sm text-muted">None yet</p>
      </section>
    );
  }

  const allSelected = photos.every((p) => selected.has(p.id));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl">
          {title}{" "}
          <span className="text-base font-normal text-muted">({photos.length})</span>
        </h3>
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
          Select all
        </label>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {photos.map((p) => {
          const on = selected.has(p.id);
          return (
            <li key={p.id} className="group relative overflow-hidden rounded-md border border-line">
              <button
                type="button"
                className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded border border-line bg-surface/90"
                aria-label={on ? "Deselect" : "Select"}
                onClick={() => onToggle(p.id)}
              >
                {on ? "✓" : ""}
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbUrl}
                alt=""
                className={`aspect-square w-full object-cover ${on ? "opacity-80" : ""}`}
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <Button
                  size="sm"
                  tone="danger"
                  disabled={deleting}
                  onClick={() => onDeleteOne(p.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
