"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ActionStack,
  Button,
  ButtonLink,
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
import { DeliveryPublishChecklist } from "@/components/wizard/DeliveryPublishChecklist";
import { cn } from "@/lib/cn";
import { mutateJson } from "@/lib/client/mutation";
import { toastAfterEmailAttempt } from "@/lib/copy/email-toast";
import {
  confirmDeletePhotos,
  confirmGoLive,
} from "@/lib/destructive-confirm";
import { deliveryPublishItems } from "@/lib/delivery-publish";
import type {
  DownloadPinPolicy,
  Shoot,
  StudioTheme,
  WatermarkPreset,
} from "@/lib/types";
import type { WizardGallery, WizardPhoto } from "@/components/wizard/useShootWizard";

export function DeliveryStep({
  shoot,
  clientName,
  projectEmail,
  gallery,
  photos,
  watermarkPresets,
  onChanged,
  /** When Layout tab is open — parent hides wizard Back/Continue (AURA-284). */
  onDesignFocusChange,
}: {
  shoot: Shoot;
  clientName: string;
  projectEmail?: string;
  gallery: WizardGallery | null;
  photos: WizardPhoto[];
  watermarkPresets: WatermarkPreset[];
  onChanged: () => Promise<unknown>;
  onDesignFocusChange?: (focused: boolean) => void;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const uploadSession = useUploadSession();
  const [title, setTitle] = useState(`${clientName} gallery`);
  const [pin, setPin] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [pinPolicy, setPinPolicy] = useState<DownloadPinPolicy>("required");
  const [studioTheme, setStudioTheme] = useState<StudioTheme | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"photos" | "design">("photos");
  const [goingLive, setGoingLive] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadStudio() {
      const res = await fetch("/api/studio");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const policy = data.studio?.deliveryDefaults?.downloadPinPolicy;
      if (policy === "optional" || policy === "required") {
        setPinPolicy(policy);
      }
      if (data.studio?.theme) {
        setStudioTheme(data.studio.theme as StudioTheme);
      }
    }
    void loadStudio();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onDesignFocusChange?.(tab === "design");
    return () => onDesignFocusChange?.(false);
  }, [tab, onDesignFocusChange]);

  const peekPhotos = useMemo(
    () => photos.filter((p) => p.kind === "peek"),
    [photos],
  );
  const videoPhotos = useMemo(
    () => photos.filter((p) => p.kind === "video"),
    [photos],
  );
  const mainPhotos = useMemo(
    () =>
      photos.filter(
        (p) => p.kind === "main" || !["peek", "video"].includes(p.kind),
      ),
    [photos],
  );

  async function createGallery(e: FormEvent) {
    e.preventDefault();
    const pinRequired = pinPolicy === "required";
    if (pinRequired && !/^\d{4}$/.test(pin)) {
      push("Choose a 4-digit download PIN", "danger");
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      push("PIN must be 4 digits", "danger");
      return;
    }
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: shoot.id,
        title,
        ...(pin ? { pin } : {}),
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
      uploadFile: async (file, { onProgress }) => {
        // Unified: every file goes direct → R2 (presigned or multipart).
        // Photos get Sharp derivatives on complete; video registers only.
        // Parallel file pool + progress via useUploadSession (AURA-267).
        const { uploadGalleryFileDirect } = await import(
          "@/lib/client/direct-upload"
        );
        await uploadGalleryFileDirect(
          gallery.id,
          file,
          kind,
          (uploaded, total) => {
            onProgress(total ? (uploaded / total) * 100 : 0);
          },
        );
      },
    });
    await onChanged();
  }

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    if (!gallery) return false;
    const watermarkTouch =
      "watermarkEnabled" in body || "watermarkPresetId" in body;
    if (watermarkTouch) push("Refreshing watermarks…", "neutral");
    const result = await mutateJson(`/api/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { action: "update" });
    if (!result.ok) {
      push(result.errorMessage, "danger");
      return false;
    }
    if (watermarkTouch) push("Watermark previews updated", "success");
    await onChanged();
    return true;
  }

  async function goLive() {
    if (!gallery) return;
    const ok = await confirm(confirmGoLive(gallery.title));
    if (!ok) return;
    setGoingLive(true);
    try {
      const saved = await patch({ goLive: true });
      if (saved) push("Gallery is live", "success");
    } finally {
      setGoingLive(false);
    }
  }

  function galleryPublicUrl() {
    if (typeof window === "undefined" || !gallery) return "";
    return `${window.location.origin}/g/${gallery.publicToken}`;
  }

  async function copyGalleryLink() {
    try {
      await navigator.clipboard.writeText(galleryPublicUrl());
      push("Gallery link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function emailGalleryLink() {
    if (!gallery) return;
    const to = shoot.projectId
      ? (await fetch(`/api/projects/${shoot.projectId}`).then((r) =>
          r.ok ? r.json() : null,
        ).then((d) => (d?.project || d?.client)?.email)) || ""
      : "";
    if (!to) {
      push("Add project email on the project", "danger");
      return;
    }
    setEmailBusy(true);
    const res = await fetch(`/api/galleries/${gallery.id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setEmailBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(String(data.error || "Could not email gallery"), "danger");
      return;
    }
    const toast = toastAfterEmailAttempt(
      data.emailed !== false,
      "Gallery link emailed",
      "Gallery link ready",
    );
    push(toast.message, toast.tone);
    if (data.emailed !== false) await onChanged();
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
    push("Watermark refresh queued", "success");
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
    const ok = await confirm(confirmDeletePhotos(ids.length));
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
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h2 className="font-display text-2xl">Delivery</h2>
          <p className="mt-1 text-sm text-muted">
            Create the gallery, then upload.
          </p>
        </div>
        <form onSubmit={createGallery} className="space-y-4">
          <Field>
            <Label htmlFor="gallery-title">Gallery title</Label>
            <Input
              id="gallery-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="gallery-pin">
              Download PIN{pinPolicy === "optional" ? " (optional)" : ""}
            </Label>
            <Input
              id="gallery-pin"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="4 digits"
              required={pinPolicy === "required"}
            />
          </Field>
          <Button type="submit" className="min-h-11 w-full sm:w-auto">
            Create gallery
          </Button>
        </form>
      </div>
    );
  }

  const isDraft = gallery.status === "draft";
  const publishItems = deliveryPublishItems({
    gallery,
    photoCount: mainPhotos.length,
    pinPolicy,
    projectEmail,
  });

  function onPublishAction(
    action: "photos" | "design" | "live" | "email" | "pin",
  ) {
    if (action === "design") {
      setTab("design");
      return;
    }
    if (action === "photos" || action === "pin") {
      setTab("photos");
      if (action === "pin") {
        window.setTimeout(() => {
          document.getElementById("delivery-pin")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 50);
      }
      return;
    }
    if (action === "live") {
      if (isDraft) void goLive();
      else push("Gallery already published", "neutral");
      return;
    }
    if (action === "email") {
      void emailGalleryLink();
    }
  }

  return (
    <div className="space-y-8">
      {uploadSession.dialog}

      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-2xl tracking-tight">{gallery.title}</h2>
          <p className="text-sm text-muted">
            {gallery.status}
            <span className="mx-2 text-line">·</span>
            {photos.length} {photos.length === 1 ? "file" : "files"}
          </p>
        </div>
        <div className={cn("min-w-0 sm:max-w-xs", tab === "design" && "max-md:hidden")}>
          <ActionStack
            primaryId={isDraft ? "live" : "preview"}
            moreLabel="Share"
            actions={[
              ...(isDraft
                ? [
                    {
                      id: "live",
                      label: "Go live",
                      tone: "accent" as const,
                      pending: goingLive,
                      pendingLabel: "Publishing…",
                      onClick: () => void goLive(),
                    },
                  ]
                : []),
              {
                id: "preview",
                label: "Preview",
                href: `/g/${gallery.publicToken}`,
                external: true,
                tone: isDraft ? ("neutral" as const) : ("accent" as const),
              },
              {
                id: "copy",
                label: "Copy link",
                tone: "neutral",
                onClick: () => void copyGalleryLink(),
              },
              {
                id: "email",
                label: "Email link",
                tone: "neutral",
                pending: emailBusy,
                pendingLabel: "Sending…",
                onClick: () => void emailGalleryLink(),
              },
            ]}
          />
        </div>
      </header>

      <div className={cn(tab === "design" && "max-md:hidden")}>
        <DeliveryPublishChecklist
          items={publishItems}
          onAction={onPublishAction}
        />
      </div>

      <div
        role="tablist"
        aria-label="Delivery views"
        className="flex gap-1 border-b border-line"
      >
        {(
          [
            { id: "photos", label: "Photos" },
            { id: "design", label: "Layout" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-3 text-sm transition-colors",
              tab === t.id
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "design" ? (
        <GalleryDesignPanel
          embedded
          design={gallery.design}
          coverPhotoUrl={gallery.coverPhotoUrl}
          studioTheme={studioTheme}
          onSave={async (body) => {
            const saved = await patch(body);
            if (saved) push("Design saved", "success");
          }}
        />
      ) : null}

      {tab === "photos" ? (
        <div className="space-y-8">
          {photos.length === 0 ? (
            <EmptyState
              variant="centered"
              title="No photos yet"
              description="Upload the gallery, then sneak peek or video if needed."
              action={
                <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <FileUploadButton
                    label="Upload gallery"
                    multiple
                    className="min-h-11"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadFiles("main", files)}
                  />
                  <FileUploadButton
                    label="Sneak peek"
                    multiple
                    tone="ghost"
                    className="min-h-11"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadFiles("peek", files)}
                  />
                  <FileUploadButton
                    label="Video"
                    accept="video/*"
                    multiple
                    tone="ghost"
                    className="min-h-11"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadFiles("video", files)}
                  />
                </div>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <FileUploadButton
                    label="Add photos"
                    multiple
                    className="min-h-11"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadFiles("main", files)}
                  />
                  <FileUploadButton
                    label="Sneak peek"
                    multiple
                    tone="ghost"
                    className="min-h-11"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadFiles("peek", files)}
                  />
                  <FileUploadButton
                    label="Video"
                    accept="video/*"
                    multiple
                    tone="ghost"
                    className="min-h-11"
                    disabled={uploadSession.busy}
                    onFiles={(files) => void uploadFiles("video", files)}
                  />
                </div>
                {selected.size > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">
                      {selected.size} selected
                    </span>
                    <Button
                      size="sm"
                      tone="danger"
                      className="min-h-11"
                      disabled={deleting}
                      onClick={() => void deleteIds([...selected])}
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      tone="ghost"
                      className="min-h-11"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-10">
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
                  title="Sneak peek"
                  photos={peekPhotos}
                  selected={selected}
                  onToggle={toggleSelect}
                  onToggleAll={(on) => toggleGroup(peekPhotos, on)}
                  onDeleteOne={(id) => void deleteIds([id])}
                  deleting={deleting}
                  hideWhenEmpty
                />
                <PhotoGroup
                  title="Video"
                  photos={videoPhotos}
                  selected={selected}
                  onToggle={toggleSelect}
                  onToggleAll={(on) => toggleGroup(videoPhotos, on)}
                  onDeleteOne={(id) => void deleteIds([id])}
                  deleting={deleting}
                  hideWhenEmpty
                />
              </div>
            </>
          )}

          <section className="space-y-5 border-t border-line pt-8">
            <h3 className="font-display text-xl">Settings</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
                  <span>Comments</span>
                  <Switch
                    checked={gallery.commentsEnabled}
                    onCheckedChange={(v) => void patch({ commentsEnabled: v })}
                    label="Comments"
                  />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
                  <span>Watermark</span>
                  <Switch
                    checked={gallery.watermarkEnabled}
                    onCheckedChange={(v) => void patch({ watermarkEnabled: v })}
                    label="Watermark"
                  />
                </label>
                {gallery.watermarkEnabled ? (
                  <Field>
                    <Label htmlFor="wm-preset">Watermark preset</Label>
                    <Select
                      id="wm-preset"
                      value={gallery.watermarkPresetId || ""}
                      onChange={(e) =>
                        void patch({ watermarkPresetId: e.target.value })
                      }
                    >
                      <option value="">Studio default</option>
                      {watermarkPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <ButtonLink
                        href="/admin/settings/delivery"
                        tone="ghost"
                        size="sm"
                        className="min-h-11 w-full sm:w-auto"
                      >
                        Delivery settings
                      </ButtonLink>
                      <Button
                        type="button"
                        tone="ghost"
                        size="sm"
                        className="min-h-11 w-full sm:w-auto"
                        onClick={() => void refreshWatermarks()}
                      >
                        Refresh watermarks
                      </Button>
                    </div>
                  </Field>
                ) : null}
              </div>
              <div id="delivery-pin" className="space-y-4 scroll-mt-24">
                <Field>
                  <Label htmlFor="reset-pin">Download PIN</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="reset-pin"
                      value={resetPin}
                      maxLength={4}
                      inputMode="numeric"
                      placeholder="New 4-digit PIN"
                      onChange={(e) =>
                        setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                    />
                    <Button
                      tone="neutral"
                      className="min-h-11 shrink-0"
                      onClick={async () => {
                        if (!/^\d{4}$/.test(resetPin)) {
                          push("PIN must be 4 digits", "danger");
                          return;
                        }
                        const saved = await patch({ pin: resetPin });
                        if (!saved) return;
                        setResetPin("");
                        push("PIN updated", "success");
                      }}
                    >
                      Update PIN
                    </Button>
                  </div>
                </Field>
                <Field>
                  <Label htmlFor="select-limit">Selection limit</Label>
                  <Select
                    id="select-limit"
                    value={gallery.selectLimit != null ? String(gallery.selectLimit) : ""}
                    onChange={(e) =>
                      void patch({
                        selectLimit: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">No limit</option>
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} photos
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="space-y-2 border-t border-line pt-4">
                  <p className="text-sm text-muted">
                    Expires{" "}
                    {new Date(gallery.expiresAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      tone="neutral"
                      size="sm"
                      className="min-h-11"
                      onClick={() => void patch({ extendDays: 7 })}
                    >
                      Extend 7 days
                    </Button>
                    <Button
                      type="button"
                      tone="neutral"
                      size="sm"
                      className="min-h-11"
                      onClick={() => void patch({ extendDays: 30 })}
                    >
                      Extend 30 days
                    </Button>
                    {gallery.status === "live" ? (
                      <Button
                        type="button"
                        tone="danger"
                        size="sm"
                        className="min-h-11"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Expire gallery now?",
                            message: "Clients will no longer be able to view or download.",
                            confirmLabel: "Expire now",
                            tone: "danger",
                          });
                          if (!ok) return;
                          const saved = await patch({ expireEarly: true });
                          if (saved) push("Gallery expired", "success");
                        }}
                      >
                        Expire now
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
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
  hideWhenEmpty,
}: {
  title: string;
  photos: WizardPhoto[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  onDeleteOne: (id: string) => void;
  deleting: boolean;
  hideWhenEmpty?: boolean;
}) {
  if (photos.length === 0) {
    if (hideWhenEmpty) return null;
    return null;
  }

  const allSelected = photos.every((p) => selected.has(p.id));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">
          {title}{" "}
          <span className="font-normal text-muted">({photos.length})</span>
        </h3>
        <button
          type="button"
          className="min-h-11 text-sm text-muted hover:text-ink"
          onClick={() => onToggleAll(!allSelected)}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {photos.map((p) => {
          const on = selected.has(p.id);
          return (
            <li
              key={p.id}
              className="group relative overflow-hidden border border-line"
            >
              <button
                type="button"
                className="absolute left-2 top-2 z-10 flex h-11 w-11 items-center justify-center border border-line bg-surface/95 text-sm"
                aria-label={on ? "Deselect" : "Select"}
                onClick={() => onToggle(p.id)}
              >
                {on ? "✓" : ""}
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbUrl}
                alt=""
                className={cn(
                  "aspect-square w-full object-cover",
                  on && "opacity-75",
                )}
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <Button
                  size="sm"
                  tone="danger"
                  className="min-h-11"
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
