"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { AlbumNav, type AlbumNavItem } from "@/components/gallery/AlbumNav";
import { AlbumView } from "@/components/gallery/AlbumView";
import {
  GalleryGuestState,
  type GalleryGuestReason,
} from "@/components/gallery/GalleryGuestState";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { LightboxPhotoFooter } from "@/components/gallery/LightboxPhotoFooter";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { GalleryContactDialog } from "@/components/gallery/GalleryContactDialog";
import { PinModal } from "@/components/gallery/PinModal";
import { PublicShell } from "@/components/shells/PublicShell";
import { EmptyState, useConfirm, useToast } from "@/components/ui";
import {
  downloadConfirmCopy,
  downloadCopy,
  emptyDownloadMessage,
} from "@/lib/download-copy";
import {
  resolveGalleryBrandCssVars,
  resolveGalleryFontPreset,
} from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { mutationOfflineMessage } from "@/lib/offline";
import {
  galleryHref,
  galleryPeekHref,
  subAlbumHref,
} from "@/lib/public-gallery-paths";
import type { GalleryDesign, StudioTheme } from "@/lib/types";

const ALBUM_LOAD_MS = 20_000;

type SubAlbumPayload = {
  unavailable?: boolean;
  reason?: "draft" | "expired" | "archived";
  album?: { label: string; token: string; photoIds?: string[] };
  galleryTitle?: string;
  gallery?: {
    title: string;
    publicToken?: string;
    design?: GalleryDesign;
    status?: string;
    hasDownloadPin?: boolean;
  };
  albums?: { token: string; label: string; count: number }[];
  hasPeek?: boolean;
  photos: MasonryPhoto[];
  studio: {
    name: string;
    logoUrl?: string;
    ownerEmail?: string;
    phone?: string;
    theme?: StudioTheme;
    showGalleryContactForm?: boolean;
  };
};

/** Sub-album UI under `/g/{galleryToken}/s/{albumToken}` (AURA-434). */
export function SubAlbumClient({
  albumToken,
  galleryToken,
}: {
  albumToken: string;
  /** Parent gallery public token from the route — must match payload. */
  galleryToken: string;
}) {
  const router = useRouter();
  const { alert, confirm } = useConfirm();
  const { push } = useToast();
  const [data, setData] = useState<SubAlbumPayload | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [downloadPhotoId, setDownloadPhotoId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [guestReason, setGuestReason] = useState<GalleryGuestReason | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setGuestReason(null);
    setData(null);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), ALBUM_LOAD_MS);
    try {
      const res = await fetch(`/api/public/subalbums/${albumToken}`, {
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => ({}))) as SubAlbumPayload & {
        error?: string;
      };
      if (res.status === 404) {
        setGuestReason("not_found");
        return;
      }
      if (!res.ok) {
        setGuestReason("load_failed");
        return;
      }
      if (json.unavailable && json.reason) {
        setData(json);
        setGuestReason(json.reason);
        return;
      }
      const hub = json.gallery?.publicToken;
      if (hub && hub !== galleryToken) {
        router.replace(subAlbumHref(hub, albumToken));
        return;
      }
      if (hub && json.album?.token && json.album.token !== albumToken) {
        router.replace(subAlbumHref(hub, json.album.token));
        return;
      }
      setData(json);
    } catch (e) {
      if (
        ctrl.signal.aborted ||
        (e instanceof DOMException && e.name === "AbortError")
      ) {
        setGuestReason("timeout");
        return;
      }
      setGuestReason("load_failed");
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, [albumToken, galleryToken, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hub = data?.gallery?.publicToken;
    if (!hub) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/public/galleries/${hub}/favorites`, {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json().catch(() => ({}))) as {
          favoritePhotoIds?: string[];
        };
        if (!cancelled) setFavorites(json.favoritePhotoIds || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.gallery?.publicToken]);

  const navItems = useMemo((): AlbumNavItem[] => {
    if (!data?.gallery?.publicToken) return [];
    const hub = data.gallery.publicToken;
    const items: AlbumNavItem[] = [
      {
        id: "hub",
        label: "All photos",
        href: galleryHref(hub),
        active: false,
      },
    ];
    if (data.hasPeek) {
      items.push({
        id: "peek",
        label: "Sneak peek",
        href: galleryPeekHref(hub),
      });
    }
    for (const a of data.albums || []) {
      items.push({
        id: a.token,
        label: a.label,
        href: subAlbumHref(hub, a.token),
        active: a.token === albumToken,
      });
    }
    return items;
  }, [data, albumToken]);

  async function shareAlbum() {
    const hub = data?.gallery?.publicToken || galleryToken;
    const shareUrl = `${window.location.origin}${subAlbumHref(hub, albumToken)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.album?.label || "Album",
          text: data?.galleryTitle
            ? `${data.album?.label || "Album"} · ${data.galleryTitle}`
            : data?.album?.label,
          url: shareUrl,
        });
        push("Shared", "success");
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      push("Link copied", "success");
    } catch {
      push("Could not copy link", "danger");
    }
  }

  async function toggleFavorite(photoId: string) {
    const hub = data?.gallery?.publicToken || galleryToken;
    try {
      const res = await fetch(`/api/public/galleries/${hub}/favorites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        favoritePhotoIds?: string[];
      };
      if (!res.ok) {
        push(String(json.error || "Could not update favorites"), "danger");
        return;
      }
      setFavorites(json.favoritePhotoIds || []);
    } catch {
      push(mutationOfflineMessage("update favorites"), "danger");
    }
  }

  async function runSingleDownload(pin: string, photoId: string) {
    const hub = data?.gallery?.publicToken || galleryToken;
    try {
      const res = await fetch(`/api/public/galleries/${hub}/download`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, photoId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        filename?: string;
      };
      if (!res.ok) {
        throw new Error(String(payload.error || "Download failed"));
      }
      if (!payload.url) {
        await alert({
          title: "Nothing to download",
          message: emptyDownloadMessage("single"),
        });
        return;
      }
      const a = document.createElement("a");
      a.href = payload.url;
      a.download = payload.filename || "photo.jpg";
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setPinOpen(false);
      setPinError(null);
      setDownloadPhotoId(null);
      push("Downloading", "success");
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
    }
  }

  async function startSingleDownload(photoId: string) {
    setDownloadPhotoId(photoId);
    setPinError(null);
    if (data?.gallery?.hasDownloadPin) {
      setPinOpen(true);
      return;
    }
    void runSingleDownload("", photoId);
  }

  async function runAlbumDownload(pin: string) {
    const hubToken = data?.gallery?.publicToken;
    const photoIds =
      data?.album?.photoIds || data?.photos.map((p) => p.id) || [];
    if (!hubToken || !photoIds.length) {
      await alert({
        title: "Download failed",
        message: "No photos to download",
      });
      return;
    }

    const CHUNK = 30;
    const body = { pin, photoIds, maxUrls: CHUNK };
    const allUrls: { url: string; filename: string }[] = [];
    const allSkipped: string[] = [];
    let videosExcluded: string[] = [];
    let nextIndex: number | null = 0;

    try {
      while (nextIndex != null) {
        const res: Response = await fetch(
          `/api/public/galleries/${hubToken}/download`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...body,
              startIndex: nextIndex || 0,
            }),
          },
        );
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          urls?: { url: string; filename: string }[];
          skipped?: string[];
          videosExcluded?: string[];
          url?: string;
          filename?: string;
          nextIndex?: number | null;
        };
        if (!res.ok) {
          throw new Error(String(payload.error || "Download failed"));
        }
        allUrls.push(...(payload.urls || []));
        allSkipped.push(...(payload.skipped || []));
        if (payload.videosExcluded?.length) {
          videosExcluded = payload.videosExcluded;
        }
        if (payload.url) {
          allUrls.push({
            url: payload.url,
            filename: payload.filename || "photo.jpg",
          });
        }
        nextIndex =
          typeof payload.nextIndex === "number" ? payload.nextIndex : null;
        if (!payload.urls?.length && !payload.url) break;
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

    if (!allUrls.length) {
      await alert({
        title: "Nothing to download",
        message: emptyDownloadMessage("album"),
      });
      return;
    }

    if (allSkipped.length || videosExcluded.length) {
      const parts: string[] = [];
      if (allSkipped.length) {
        parts.push(
          `${allSkipped.length} photo${allSkipped.length === 1 ? "" : "s"} unavailable`,
        );
      }
      if (videosExcluded.length) {
        parts.push(
          `${videosExcluded.length} video${videosExcluded.length === 1 ? "" : "s"} not in zip — use single download`,
        );
      }
      push(parts.join(" · "), "neutral");
    }

    for (const item of allUrls) {
      const a = document.createElement("a");
      a.href = item.url;
      a.download = item.filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setPinOpen(false);
    setPinError(null);
    push(
      `Downloading ${allUrls.length} photo${allUrls.length === 1 ? "" : "s"}`,
      "success",
    );
  }

  async function startDownload() {
    if (!data?.photos.length) return;
    setDownloadPhotoId(null);
    setPinError(null);
    if (data.gallery?.hasDownloadPin) {
      setPinOpen(true);
      return;
    }
    const copy = downloadConfirmCopy("album", {
      count: data.photos.length,
    });
    const ok = await confirm({
      title: copy.title,
      message: copy.description,
      confirmLabel: copy.confirmLabel,
    });
    if (!ok) return;
    void runAlbumDownload("");
  }

  if (loading && !data) {
    return (
      <PublicShell>
        <EmptyState
          variant="loading"
          title="Loading album…"
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
        galleryTitle={data?.gallery?.title || data?.galleryTitle}
        design={data?.gallery?.design}
        galleryToken={data?.gallery?.publicToken}
        onRetry={
          guestReason === "load_failed" || guestReason === "timeout"
            ? () => void load()
            : undefined
        }
      />
    );
  }

  if (!data?.album) {
    return (
      <GalleryGuestState
        reason="not_found"
        onRetry={() => void load()}
      />
    );
  }

  const design = normalizeGalleryDesign(data.gallery?.design);
  const themeStyle = resolveGalleryBrandCssVars(
    design,
    data.studio.theme,
  ) as CSSProperties;
  const fontPreset = resolveGalleryFontPreset(design, data.studio.theme);

  const albumPinCopy = downloadCopy("album", {
    count: data.photos.length,
    emphasizePin: design.download.emphasizePin,
  });

  const hubToken = data.gallery?.publicToken;
  const fullGalleryHref = hubToken ? galleryHref(hubToken) : undefined;
  const showGalleryContact = Boolean(
    data.studio.showGalleryContactForm && hubToken,
  );

  return (
    <PublicShell
      bare
      style={themeStyle}
      fontPreset={fontPreset}
      galleryMotion={design.motion}
      galleryDensity={design.density}
    >
      <AlbumView
        title={data.album.label}
        subtitle={`${data.galleryTitle || data.gallery?.title || "Gallery"} · ${
          data.studio.name
        } · ${data.photos.length} photo${data.photos.length === 1 ? "" : "s"}`}
        photos={data.photos}
        backHref={fullGalleryHref}
        backLabel="All albums"
        onPhotoClick={(photo) => {
          const idx = data.photos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) setLightboxIndex(idx);
        }}
        headerExtra={<AlbumNav items={navItems} />}
        primaryActionId={data.photos.length ? "download" : "share"}
        actionItems={[
          {
            id: "share",
            label: "Share",
            tone: "ghost",
            onClick: () => void shareAlbum(),
          },
          ...(showGalleryContact
            ? [
                {
                  id: "message",
                  label: "Message",
                  tone: "ghost" as const,
                  onClick: () => setContactOpen(true),
                },
              ]
            : []),
          ...(data.photos.length
            ? [
                {
                  id: "download",
                  label: "Download album",
                  tone: "neutral" as const,
                  onClick: () => void startDownload(),
                },
              ]
            : []),
          ...(fullGalleryHref
            ? [
                {
                  id: "gallery",
                  label: "Full gallery",
                  href: fullGalleryHref,
                  tone: "ghost" as const,
                },
              ]
            : []),
        ]}
      />

      {lightboxIndex != null ? (
        <PhotoLightbox
          photos={data.photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          footer={
            data.photos[lightboxIndex] ? (
              <LightboxPhotoFooter
                photoId={data.photos[lightboxIndex].id}
                favorited={favorites.includes(data.photos[lightboxIndex].id)}
                commentsEnabled={false}
                commentCount={0}
                onDownload={() =>
                  void startSingleDownload(data.photos[lightboxIndex!].id)
                }
                onToggleFavorite={() =>
                  void toggleFavorite(data.photos[lightboxIndex!].id)
                }
              />
            ) : null
          }
        />
      ) : null}

      {showGalleryContact && hubToken ? (
        <GalleryContactDialog
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          token={hubToken}
          studioName={data.studio.name}
          galleryTitle={data.galleryTitle || data.gallery?.title}
        />
      ) : null}

      <PinModal
        open={pinOpen}
        onClose={() => {
          setPinOpen(false);
          setPinError(null);
          setDownloadPhotoId(null);
        }}
        onSubmit={async (pin) => {
          if (downloadPhotoId) {
            await runSingleDownload(pin, downloadPhotoId);
            return;
          }
          await runAlbumDownload(pin);
        }}
        title={
          downloadPhotoId
            ? downloadCopy("single").title
            : albumPinCopy.title
        }
        description={
          downloadPhotoId
            ? downloadCopy("single").description
            : albumPinCopy.description
        }
        footnote={
          downloadPhotoId
            ? downloadCopy("single").footnote
            : albumPinCopy.footnote
        }
        confirmLabel={
          downloadPhotoId
            ? downloadCopy("single").confirmLabel
            : albumPinCopy.confirmLabel
        }
        error={pinError}
        onClearError={() => setPinError(null)}
      />
    </PublicShell>
  );
}
