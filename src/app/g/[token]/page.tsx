"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import {
  AlbumShareButton,
  AlbumView,
} from "@/components/gallery/AlbumView";
import { AlbumTile, AlbumTileGrid } from "@/components/gallery/AlbumTile";
import {
  GalleryChrome,
  galleryChromePadClass,
} from "@/components/gallery/GalleryChrome";
import {
  GalleryTileAction,
  IconDownload,
  IconHeart,
  IconShare,
} from "@/components/gallery/GalleryIcons";
import { GalleryHero } from "@/components/gallery/GalleryHero";
import { MasonryGrid, type MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { GalleryCoachTips } from "@/components/gallery/GalleryCoachTips";
import { GalleryContactDialog } from "@/components/gallery/GalleryContactDialog";
import {
  GalleryGuestState,
  GalleryUnavailableInline,
  type GalleryGuestReason,
} from "@/components/gallery/GalleryGuestState";
import { GalleryPrintPartners } from "@/components/gallery/GalleryPrintPartners";
import { PinModal } from "@/components/gallery/PinModal";
import { PublicShell } from "@/components/shells/PublicShell";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  Label,
  PublicCta,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import {
  downloadConfirmCopy,
  downloadCopy,
  emptyDownloadMessage,
} from "@/lib/download-copy";
import { resolveGalleryBrandCssVars } from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import {
  galleryEnterStaggerMs,
  galleryShouldEnterMotion,
  galleryViewAnnouncement,
} from "@/lib/gallery-experience";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { Comment, Gallery, PrintPartner, StudioTheme } from "@/lib/types";

const GALLERY_LOAD_MS = 20_000;

type PublicPhoto = MasonryPhoto & {
  kind: string;
  version: number;
  videoUrl?: string;
};

type SubAlbumSummary = {
  id: string;
  token: string;
  label: string;
  count: number;
  coverUrl?: string;
};

type GalleryPayload = {
  unavailable?: boolean;
  reason?: "draft" | "expired" | "archived";
  gallery: Gallery & { hasDownloadPin?: boolean };
  photos: PublicPhoto[];
  photoTotal?: number;
  photoOffset?: number;
  photoLimit?: number;
  hasMore?: boolean;
  clientName?: string | null;
  projectName?: string | null;
  subAlbums: SubAlbumSummary[];
  studio: {
    name: string;
    logoUrl?: string;
    brandTagline?: string;
    ownerEmail?: string;
    phone?: string;
    theme?: StudioTheme;
    printPartners?: PrintPartner[];
    showGalleryContactForm?: boolean;
  };
  comments: Comment[];
  preview?: boolean;
};

type DownloadMode = "all" | "single" | "favorites";
type ViewMode = "hub" | "favorites" | "peek";

export default function PublicGalleryPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { alert, confirm } = useConfirm();
  const { push } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [data, setData] = useState<GalleryPayload | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectsSubmittedAt, setSelectsSubmittedAt] = useState<string | null>(
    null,
  );
  const [selectLimit, setSelectLimit] = useState<number | null>(null);
  const [showSelectCount, setShowSelectCount] = useState(true);
  const [submitEnabled, setSubmitEnabled] = useState(false);
  const [submittingSelects, setSubmittingSelects] = useState(false);
  const [view, setView] = useState<ViewMode>("hub");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("all");
  const [downloadPhotoId, setDownloadPhotoId] = useState<string | null>(null);
  const [commentName, setCommentName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [subSelected, setSubSelected] = useState<string[]>([]);
  const [subUrl, setSubUrl] = useState("");
  const [guestReason, setGuestReason] = useState<GalleryGuestReason | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  function applyFavoritesPayload(favJson: {
    favoritePhotoIds?: string[];
    submittedAt?: string | null;
    selectLimit?: number | null;
    showCount?: boolean;
    submitEnabled?: boolean;
  }) {
    setFavorites(favJson.favoritePhotoIds || []);
    setSelectsSubmittedAt(favJson.submittedAt || null);
    if (favJson.selectLimit !== undefined) {
      setSelectLimit(
        favJson.selectLimit != null ? Number(favJson.selectLimit) : null,
      );
    }
    if (typeof favJson.showCount === "boolean") {
      setShowSelectCount(favJson.showCount);
    }
    if (typeof favJson.submitEnabled === "boolean") {
      setSubmitEnabled(favJson.submitEnabled);
    }
  }

  const loadMorePhotos = useCallback(
    async (
      signal: AbortSignal,
      start: { offset: number; limit: number },
    ) => {
      setLoadingMore(true);
      let offset = start.offset;
      let limit = start.limit;
      try {
        for (;;) {
          const res = await fetch(
            `/api/public/galleries/${token}?offset=${offset}&limit=${limit}`,
            { credentials: "include", signal },
          );
          if (!res.ok) break;
          const page = (await res.json()) as Pick<
            GalleryPayload,
            "photos" | "photoTotal" | "photoOffset" | "photoLimit" | "hasMore"
          >;
          const batch = page.photos || [];
          setData((prev) => {
            if (!prev) return prev;
            const seen = new Set(prev.photos.map((p) => p.id));
            const added = batch.filter((p) => !seen.has(p.id));
            return {
              ...prev,
              photos: [...prev.photos, ...added],
              photoTotal: page.photoTotal ?? prev.photoTotal,
              photoLimit: page.photoLimit ?? prev.photoLimit,
              hasMore: Boolean(page.hasMore),
            };
          });
          if (!page.hasMore || !batch.length) break;
          offset += batch.length;
          if (page.photoLimit) limit = page.photoLimit;
        }
      } catch {
        /* keep partial grid */
      } finally {
        setLoadingMore(false);
      }
    },
    [token],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadingMore(false);
    setGuestReason(null);
    setData(null);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), GALLERY_LOAD_MS);
    try {
      const res = await fetch(`/api/public/galleries/${token}`, {
        credentials: "include",
        signal: ctrl.signal,
      });
      if (res.status === 404) {
        setGuestReason("not_found");
        return;
      }
      if (!res.ok) {
        setGuestReason("load_failed");
        return;
      }
      const json = (await res.json()) as GalleryPayload;
      if (json.unavailable && json.reason) {
        setData(json);
        setGuestReason(json.reason);
        return;
      }
      setData(json);
      if (json.gallery.selectLimit != null) {
        setSelectLimit(Number(json.gallery.selectLimit));
      }
      const favRes = await fetch(`/api/public/galleries/${token}/favorites`, {
        credentials: "include",
        signal: ctrl.signal,
      });
      if (favRes.ok) {
        applyFavoritesPayload(await favRes.json());
      } else {
        setFavorites([]);
        setSelectsSubmittedAt(null);
      }
      // First page paints; remaining pages load in background (AURA-256).
      if (json.hasMore) {
        window.clearTimeout(timer);
        setLoading(false);
        void loadMorePhotos(ctrl.signal, {
          offset: (json.photoOffset ?? 0) + json.photos.length,
          limit: json.photoLimit || 48,
        });
        return;
      }
    } catch (e) {
      if (ctrl.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        setGuestReason("timeout");
        return;
      }
      setGuestReason("load_failed");
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, [token, loadMorePhotos]);

  useEffect(() => {
    void load();
  }, [load]);

  const mainPhotos = useMemo(
    () =>
      data?.photos.filter((p) => p.kind === "main" || p.kind === "video") || [],
    [data],
  );
  const peekPhotos = useMemo(
    () => data?.photos.filter((p) => p.kind === "peek") || [],
    [data],
  );
  const favoritePhotos = useMemo(
    () => mainPhotos.filter((p) => favorites.includes(p.id)),
    [mainPhotos, favorites],
  );

  const albumPhotos = useMemo(() => {
    if (view === "favorites") return favoritePhotos;
    if (view === "peek") return peekPhotos;
    return mainPhotos;
  }, [view, favoritePhotos, peekPhotos, mainPhotos]);

  const heroImages = useMemo(() => {
    const designCover = data?.gallery.design?.coverPhotoId;
    const byId = designCover
      ? data?.photos.find((p) => p.id === designCover)
      : null;
    const cover = data?.gallery.coverPhotoUrl;
    const pool = [
      ...(byId ? [byId.url] : []),
      ...(cover ? [cover] : []),
      ...peekPhotos.map((p) => p.url),
      ...mainPhotos.map((p) => p.url),
    ];
    return [...new Set(pool)].slice(0, 8);
  }, [data, peekPhotos, mainPhotos]);

  const selected =
    lightboxIndex != null ? albumPhotos[lightboxIndex] || null : null;

  async function openPhoto(photo: MasonryPhoto, fromList: PublicPhoto[] = mainPhotos) {
    const idx = fromList.findIndex((p) => p.id === photo.id);
    if (idx < 0) return;
    setLightboxIndex(idx);
    await fetch(`/api/public/galleries/${token}/photo-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: photo.id }),
    });
  }

  async function toggleFavorite(photoId: string) {
    if (selectsSubmittedAt) {
      push("Selects already submitted", "neutral");
      return;
    }
    const adding = !favorites.includes(photoId);
    if (
      adding &&
      selectLimit != null &&
      favorites.length >= selectLimit
    ) {
      push(`${favorites.length} of ${selectLimit} selected`, "neutral");
      return;
    }
    const res = await fetch(`/api/public/galleries/${token}/favorites`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(String(json.error || "Could not update favorites"), "danger");
      return;
    }
    applyFavoritesPayload(json);
  }

  async function submitSelects() {
    if (!favorites.length || selectsSubmittedAt) return;
    setSubmittingSelects(true);
    try {
      const res = await fetch(`/api/public/galleries/${token}/favorites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        push(String(json.error || "Could not submit selects"), "danger");
        return;
      }
      applyFavoritesPayload(json);
      push("Selects submitted", "success");
    } finally {
      setSubmittingSelects(false);
    }
  }

  async function startDownload(mode: DownloadMode, photoId?: string) {
    const nextPhotoId =
      mode === "single" ? photoId || selected?.id || null : null;
    setDownloadMode(mode);
    setDownloadPhotoId(nextPhotoId);
    setPinError(null);
    if (!data?.gallery.hasDownloadPin) {
      if (mode !== "single") {
        const copy = downloadConfirmCopy(mode, {
          count: mode === "favorites" ? favorites.length : undefined,
        });
        const ok = await confirm({
          title: copy.title,
          message: copy.description,
          confirmLabel: copy.confirmLabel,
        });
        if (!ok) return;
      }
      void runDownload("", mode, nextPhotoId);
      return;
    }
    setPinOpen(true);
  }

  async function fetchDownloadPayload(body: Record<string, unknown>) {
    const res = await fetch(`/api/public/galleries/${token}/download`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Download failed" }));
      throw new Error(String(err.error || "Download failed"));
    }
    return res.json();
  }

  async function handleDownload(pin: string) {
    await runDownload(pin, downloadMode, downloadPhotoId);
  }

  async function runDownload(
    pin: string,
    mode: DownloadMode,
    photoId: string | null,
  ) {
    const body: Record<string, string> = { pin };
    if (mode === "single" && photoId) {
      body.photoId = photoId;
    } else if (mode === "favorites") {
      body.mode = "favorites";
    }

    const CHUNK = 30;
    let payload: {
      url?: string;
      filename?: string;
      urls?: { url: string; filename: string }[];
      skipped?: string[];
      videosExcluded?: string[];
      totalIncluded?: number;
      nextIndex?: number;
    };
    try {
      if (mode === "single") {
        payload = await fetchDownloadPayload(body);
      } else {
        payload = await fetchDownloadPayload({ ...body, maxUrls: CHUNK });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Download failed";
      if (pinOpen && /invalid pin/i.test(msg)) {
        setPinError(msg);
        throw e instanceof Error ? e : new Error(msg);
      }
      await alert({
        title: "Download failed",
        message: msg,
      });
      return;
    }

    function triggerDownload(href: string, filename?: string) {
      const a = document.createElement("a");
      a.href = href;
      if (filename) a.download = filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    if (payload.url) {
      triggerDownload(payload.url, payload.filename);
      setPinOpen(false);
      return;
    }

    const allUrls = [...(payload.urls || [])];
    const allSkipped = [...(payload.skipped || [])];
    let nextIndex = payload.nextIndex;
    while (nextIndex != null && mode !== "single") {
      try {
        const chunk = await fetchDownloadPayload({
          ...body,
          maxUrls: CHUNK,
          startIndex: nextIndex,
        });
        allUrls.push(...(chunk.urls || []));
        allSkipped.push(...(chunk.skipped || []));
        nextIndex = chunk.nextIndex;
        if (chunk.skipped?.length) {
          push(`${chunk.skipped.length} photo${chunk.skipped.length === 1 ? "" : "s"} unavailable`, "neutral");
        }
      } catch {
        push("Could not sign remaining photos — try again", "danger");
        break;
      }
    }

    if (allUrls.length) {
      if (allSkipped.length || payload.videosExcluded?.length) {
        const parts: string[] = [];
        if (allSkipped.length) {
          parts.push(`${allSkipped.length} photo${allSkipped.length === 1 ? "" : "s"} unavailable`);
        }
        if (payload.videosExcluded?.length) {
          parts.push(`${payload.videosExcluded.length} video${payload.videosExcluded.length === 1 ? "" : "s"} not in zip — use single download`);
        }
        push(parts.join(" · "), "neutral");
      }
      const zipName = `${(data?.gallery.title || "gallery").replace(/\s+/g, "-")}.zip`;
      try {
        push("Preparing zip…", "success");
        const { zipSignedDownloads, saveBlobDownload } = await import(
          "@/lib/client/zip-downloads"
        );
        const blob = await zipSignedDownloads(allUrls, {
          onProgress: ({ done, total }) => {
            if (done === total || done % 5 === 0) {
              push(`Zipping ${done} of ${total}`, "success");
            }
          },
        });
        saveBlobDownload(blob, zipName);
        setPinOpen(false);
        return;
      } catch {
        // CORS not set on R2 yet — fall back to individual signed downloads.
        push("Zip unavailable — downloading files individually", "neutral");
        for (const item of allUrls) {
          triggerDownload(item.url, item.filename);
          await new Promise((r) => setTimeout(r, 150));
        }
        setPinOpen(false);
        return;
      }
    }

    await alert({
      title: "Nothing to download",
      message: emptyDownloadMessage(
        mode === "favorites"
          ? "favorites"
          : mode === "single"
            ? "single"
            : "all",
      ),
    });
  }

  async function submitComment() {
    if (!selected || !commentBody.trim()) return;
    const res = await fetch(`/api/public/galleries/${token}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoId: selected.id,
        authorName: commentName || "Guest",
        body: commentBody,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      push(String(json.error || "Could not post comment"), "danger");
      return;
    }
    setCommentBody("");
    await load();
  }

  async function createSubAlbum() {
    if (!subSelected.length) return;
    const res = await fetch(`/api/public/galleries/${token}/subalbums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: subLabel || "Shared album",
        photoIds: subSelected,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(String(json.error || "Could not create share link"), "danger");
      return;
    }
    const href = `/s/${json.subAlbum.token}`;
    setSubUrl(href);
    setSubOpen(false);
    setSubSelected([]);
    const absolute = `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(absolute);
      push("Share link copied", "success");
    } catch {
      push("Share link ready", "success");
    }
    await load();
  }

  async function shareAlbum() {
    const absolute = `${window.location.origin}/g/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.gallery.title || "Gallery",
          text: data?.projectName || data?.clientName
            ? `Photos for ${data.projectName || data.clientName}`
            : "Gallery",
          url: absolute,
        });
        push("Shared", "success");
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(absolute);
      push("Link copied", "success");
    } catch {
      push("Could not copy link", "danger");
    }
  }

  function scrollToPhotos() {
    document.getElementById("photos")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (loading && !data) {
    return (
      <PublicShell>
        <EmptyState
          variant="loading"
          title="Loading gallery…"
          className="py-16 text-center"
        />
      </PublicShell>
    );
  }

  if (
    guestReason === "draft" ||
    guestReason === "expired" ||
    guestReason === "archived" ||
    guestReason === "not_found" ||
    guestReason === "load_failed" ||
    guestReason === "timeout"
  ) {
    return (
      <GalleryGuestState
        reason={guestReason}
        studio={data?.studio}
        galleryTitle={data?.gallery?.title}
        design={data?.gallery?.design}
        galleryToken={token}
        onRetry={
          guestReason === "load_failed" || guestReason === "timeout"
            ? () => void load()
            : undefined
        }
      />
    );
  }

  if (!data) {
    return (
      <GalleryGuestState
        reason={guestReason || "not_found"}
        onRetry={() => void load()}
      />
    );
  }

  const { gallery, studio, comments, subAlbums } = data;
  const clientName = data.projectName || data.clientName;
  const expired =
    gallery.status === "expired" || gallery.status === "archived";
  const daysLeft = expired
    ? null
    : Math.max(
        0,
        differenceInCalendarDays(new Date(gallery.expiresAt), new Date()),
      );
  const photoComments = selected
    ? comments.filter((c) => c.photoId === selected.id)
    : [];

  const design = normalizeGalleryDesign(gallery.design);
  const coverStyle = design.coverStyle;
  const gridMode = design.gridMode;
  const themeStyle = resolveGalleryBrandCssVars(
    design,
    studio.theme,
  ) as CSSProperties;

  const dateLabel = gallery.liveAt
    ? format(new Date(gallery.liveAt), "MMMM do, yyyy").toUpperCase()
    : gallery.createdAt
      ? format(new Date(gallery.createdAt), "MMMM do, yyyy").toUpperCase()
      : null;

  const limit =
    selectLimit ??
    (gallery.selectLimit != null ? Number(gallery.selectLimit) : null);
  const showCount =
    showSelectCount || design.selects.showCount || limit != null;
  const favoritesLabel = selectsSubmittedAt
    ? `Submitted (${favorites.length})`
    : limit != null
      ? `${favorites.length} of ${limit}`
      : showCount && favorites.length > 0
        ? `Favorites (${favorites.length})`
        : showCount
          ? "Favorites"
          : favorites.length > 0
            ? `Favorites (${favorites.length})`
            : "Favorites";

  const showGalleryContact = Boolean(studio.showGalleryContactForm);
  const chrome = (
    <GalleryChrome
      chrome={design.chrome}
      title={gallery.title}
      studioName={studio.name}
      logoUrl={studio.logoUrl}
      expired={expired}
      favoritesCount={favorites.length}
      favoritesLabel={favoritesLabel}
      favoritesActive={view === "favorites"}
      onFavorites={() => setView("favorites")}
      onDownload={() => void startDownload("all")}
      onShare={() => void shareAlbum()}
      showContact={showGalleryContact}
      onContact={() => setContactOpen(true)}
    />
  );
  const chromePad = galleryChromePadClass(
    design.chrome,
    expired,
    showGalleryContact,
  );
  const pinCopy = downloadCopy(downloadMode, {
    count: downloadMode === "favorites" ? favorites.length : undefined,
    emphasizePin: design.download.emphasizePin,
  });
  const gridEnter = galleryShouldEnterMotion(
    design.motion,
    prefersReducedMotion,
  );
  const gridStagger = galleryEnterStaggerMs(
    design.motion,
    prefersReducedMotion,
  );
  const viewLive = galleryViewAnnouncement(view, albumPhotos.length, {
    selectsMode: Boolean(submitEnabled || limit != null),
  });
  const viewAnnouncer = (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {viewLive}
    </p>
  );

  const peekCover =
    peekPhotos[0]?.thumbUrl || peekPhotos[0]?.url || undefined;

  if (view === "favorites" || view === "peek") {
    return (
      <PublicShell
        bare
        style={themeStyle}
        className={chromePad}
        galleryMotion={design.motion}
        galleryDensity={design.density}
      >
        {viewAnnouncer}
        {chrome}
        <AlbumView
          title={
            view === "favorites"
              ? submitEnabled || limit != null
                ? "Selects"
                : "Favorites"
              : "Sneak peek"
          }
          subtitle={
            view === "favorites"
              ? selectsSubmittedAt
                ? `Submitted · ${favorites.length} photo${
                    favorites.length === 1 ? "" : "s"
                  }`
                : limit != null
                  ? `${favorites.length} of ${limit}`
                  : `${albumPhotos.length} photo${
                      albumPhotos.length === 1 ? "" : "s"
                    }`
              : `${albumPhotos.length} photos`
          }
          photos={albumPhotos}
          stickyHeader={false}
          backLabel="All albums"
          onBack={() => {
            setLightboxIndex(null);
            setView("hub");
          }}
          onPhotoClick={(p) => void openPhoto(p, albumPhotos)}
          enter={gridEnter}
          staggerMs={gridStagger}
          emptyMessage={
            view === "favorites"
              ? "Heart photos to save selects."
              : "No sneak peek photos yet."
          }
          renderOverlay={
            view === "peek"
              ? undefined
              : (photo) => (
                  <button
                    type="button"
                    aria-label="Toggle favorite"
                    disabled={Boolean(selectsSubmittedAt)}
                    className="flex h-11 w-11 items-center justify-center bg-surface/90 disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleFavorite(photo.id);
                    }}
                  >
                    <IconHeart filled={favorites.includes(photo.id)} />
                  </button>
                )
          }
          actions={
            !expired ? (
              <>
                <AlbumShareButton onShare={() => void shareAlbum()} />
                {view === "favorites" ? (
                  <>
                    {submitEnabled ? (
                      <Button
                        size="sm"
                        tone="accent"
                        pending={submittingSelects}
                        pendingLabel="Submitting…"
                        disabled={
                          !favorites.length || Boolean(selectsSubmittedAt)
                        }
                        onClick={() => void submitSelects()}
                      >
                        {selectsSubmittedAt ? "Submitted" : "Submit selects"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      tone="neutral"
                      onClick={() => void startDownload("favorites")}
                      disabled={!favorites.length}
                    >
                      Download favorites
                    </Button>
                  </>
                ) : null}
              </>
            ) : null
          }
        />
        {!expired && design.coach.enabled ? (
          <GalleryCoachTips
            token={token}
            enabled
            hasDownloadPin={gallery.hasDownloadPin}
            showContact={showGalleryContact}
          />
        ) : null}
        {galleryDialogs()}
      </PublicShell>
    );
  }

  return (
    <PublicShell
      bare
      style={themeStyle}
      className={chromePad}
      galleryMotion={design.motion}
      galleryDensity={design.density}
    >
      {viewAnnouncer}
      {chrome}

      {coverStyle !== "none" ? (
        <GalleryHero
          images={
            coverStyle === "third" ? heroImages.slice(0, 1) : heroImages
          }
          title={gallery.title}
          dateLabel={dateLabel}
          daysLeft={daysLeft}
          cover={design.cover}
          onViewGallery={expired ? undefined : scrollToPhotos}
        />
      ) : (
        <div className="mx-auto max-w-[var(--public-max)] px-4 py-16 text-center sm:px-8">

          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            {dateLabel}
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-[0.14em] sm:text-6xl">
            {gallery.title}
          </h1>
          {!expired ? (
            <PublicCta
              surface="canvas"
              onClick={scrollToPhotos}
              className="mt-8"
            >
              View gallery
            </PublicCta>
          ) : null}
        </div>
      )}

      <main id="photos" className="mx-auto max-w-[var(--public-max)] scroll-mt-16 px-0 py-0 sm:px-0">
        {expired ? (
          <GalleryUnavailableInline
            reason={
              gallery.status === "archived" ? "archived" : "expired"
            }
            studio={studio}
            galleryToken={token}
            galleryTitle={gallery.title}
          />
        ) : (
          <>
            {peekPhotos.length > 0 || subAlbums.length > 0 ? (
              <div className="mx-auto max-w-[var(--public-max)] px-[var(--gallery-pad-x,1rem)] py-[var(--gallery-section-y,2rem)] sm:px-8">
                <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-muted">
                  Albums
                </p>
                <AlbumTileGrid>
                  {peekPhotos.length > 0 ? (
                    <AlbumTile
                      label="Sneak peek"
                      meta={`${peekPhotos.length} photos`}
                      coverUrl={peekCover}
                      href={`/g/${token}/peek`}
                      featured={!subAlbums.length}
                    />
                  ) : null}
                  {subAlbums.map((album) => (
                    <AlbumTile
                      key={album.id}
                      href={`/s/${album.token}`}
                      label={album.label}
                      meta={`${album.count} photos`}
                      coverUrl={album.coverUrl}
                    />
                  ))}
                </AlbumTileGrid>
              </div>
            ) : null}

            <div className="px-0 pt-0">
              <MasonryGrid
                photos={mainPhotos}
                gridMode={gridMode}
                enter={gridEnter}
                staggerMs={gridStagger}
                onPhotoClick={(p) => void openPhoto(p, mainPhotos)}
                hoverActions={(photo) => (
                  <>
                    <GalleryTileAction
                      label="Favorite"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFavorite(photo.id);
                      }}
                    >
                      <IconHeart
                        size={16}
                        filled={favorites.includes(photo.id)}
                      />
                    </GalleryTileAction>
                    <GalleryTileAction
                      label="Download"
                      onClick={(e) => {
                        e.stopPropagation();
                        void startDownload("single", photo.id);
                      }}
                    >
                      <IconDownload size={16} />
                    </GalleryTileAction>
                    <GalleryTileAction
                      label="Share photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubSelected([photo.id]);
                        setSubOpen(true);
                      }}
                    >
                      <IconShare size={16} />
                    </GalleryTileAction>
                  </>
                )}
              />
              {loadingMore ? (
                <p className="px-4 py-6 text-center text-sm text-muted sm:px-8">
                  Loading photos…
                </p>
              ) : null}
            </div>

            {clientName ? (
              <p className="mt-10 px-4 pb-6 text-center text-xs uppercase tracking-[0.18em] text-muted sm:px-8">
                For {clientName}
              </p>
            ) : null}

            {subUrl ? (
              <div className="mt-6 px-4 pb-6 text-center text-sm sm:px-8">
                Photo share link ready:{" "}
                <Link href={subUrl} className="text-accent">
                  Open link
                </Link>
              </div>
            ) : null}
          </>
        )}
      </main>

      {!expired ? (
        <GalleryPrintPartners partners={studio.printPartners} />
      ) : null}

      <footer className="border-t border-ink/10 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center text-sm text-muted">
        <p className="font-medium text-ink">{studio.name}</p>
        {studio.brandTagline ? (
          <p className="mt-1">{studio.brandTagline}</p>
        ) : null}
      </footer>

      {!expired && design.coach.enabled ? (
        <GalleryCoachTips
          token={token}
          enabled
          hasDownloadPin={gallery.hasDownloadPin}
          showContact={showGalleryContact}
        />
      ) : null}
      {galleryDialogs()}
    </PublicShell>
  );

  function galleryDialogs() {
    const lightboxPhotos = view === "hub" ? mainPhotos : albumPhotos;
    return (
      <>
        {lightboxIndex != null ? (
          <PhotoLightbox
            photos={lightboxPhotos}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
            footer={
              selected && !expired ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {view !== "peek" ? (
                      <>
                        <Button
                          size="sm"
                          className="min-h-11"
                          onClick={() =>
                            void startDownload("single", selected.id)
                          }
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          tone="ghost"
                          className="min-h-11"
                          onClick={() => void toggleFavorite(selected.id)}
                        >
                          {favorites.includes(selected.id)
                            ? "Unfavorite"
                            : "Favorite"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {gallery.commentsEnabled && view !== "peek" ? (
                    <div className="space-y-3">
                      {photoComments.length ? (
                        <ul className="space-y-2">
                          {photoComments.map((c) => (
                            <li key={c.id} className="text-sm text-ink">
                              <span className="font-medium">{c.authorName}</span>
                              <span className="text-muted"> · </span>
                              {c.body}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Field className="min-w-0 flex-1">
                          <Label htmlFor="lb-comment-name">Name</Label>
                          <Input
                            id="lb-comment-name"
                            value={commentName}
                            onChange={(e) => setCommentName(e.target.value)}
                          />
                        </Field>
                        <Field className="min-w-0 flex-[2]">
                          <Label htmlFor="lb-comment-body">Comment</Label>
                          <Input
                            id="lb-comment-body"
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                          />
                        </Field>
                        <Button
                          size="sm"
                          className="min-h-11 w-full sm:w-auto"
                          onClick={() => void submitComment()}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null
            }
          />
        ) : null}

        {showGalleryContact ? (
          <GalleryContactDialog
            open={contactOpen}
            onClose={() => setContactOpen(false)}
            token={token}
            studioName={studio.name}
            galleryTitle={gallery.title}
          />
        ) : null}

        <PinModal
          open={pinOpen}
          onClose={() => {
            setPinOpen(false);
            setPinError(null);
          }}
          onSubmit={handleDownload}
          title={pinCopy.title}
          description={pinCopy.description}
          footnote={pinCopy.footnote}
          confirmLabel={pinCopy.confirmLabel}
          error={pinError}
          onClearError={() => setPinError(null)}
        />

        <Dialog
          open={subOpen}
          onClose={() => setSubOpen(false)}
          title="Share photos"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Creates a link with only these photos.
            </p>
            <Field>
              <Label>Album label</Label>
              <Input
                value={subLabel}
                onChange={(e) => setSubLabel(e.target.value)}
                placeholder="Shared album"
              />
            </Field>
            <Field>
              <Label>Note</Label>
              <Textarea
                value={`${subSelected.length} photo${subSelected.length === 1 ? "" : "s"} selected`}
                readOnly
                rows={2}
              />
            </Field>
            <Button onClick={() => void createSubAlbum()}>Create link</Button>
          </div>
        </Dialog>
      </>
    );
  }
}
