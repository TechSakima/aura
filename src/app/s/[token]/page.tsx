"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useParams } from "next/navigation";
import { AlbumNav, type AlbumNavItem } from "@/components/gallery/AlbumNav";
import {
  AlbumShareButton,
  AlbumView,
} from "@/components/gallery/AlbumView";
import {
  GalleryGuestState,
  type GalleryGuestReason,
} from "@/components/gallery/GalleryGuestState";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { PinModal } from "@/components/gallery/PinModal";
import { PublicShell } from "@/components/shells/PublicShell";
import {
  Button,
  ButtonLink,
  EmptyState,
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

export default function SubAlbumPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { alert, confirm } = useConfirm();
  const { push } = useToast();
  const [data, setData] = useState<SubAlbumPayload | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
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
      const res = await fetch(`/api/public/subalbums/${token}`, {
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
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const navItems = useMemo((): AlbumNavItem[] => {
    if (!data?.gallery?.publicToken) return [];
    const hub = data.gallery.publicToken;
    const items: AlbumNavItem[] = [
      {
        id: "hub",
        label: "All photos",
        href: `/g/${hub}`,
        active: false,
      },
    ];
    if (data.hasPeek) {
      items.push({
        id: "peek",
        label: "Sneak peek",
        href: `/g/${hub}/peek`,
      });
    }
    for (const a of data.albums || []) {
      items.push({
        id: a.token,
        label: a.label,
        href: `/s/${a.token}`,
        active: a.token === token,
      });
    }
    return items;
  }, [data, token]);

  async function shareAlbum() {
    const shareUrl = `${window.location.origin}/s/${token}`;
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

  async function runAlbumDownload(pin: string) {
    const galleryToken = data?.gallery?.publicToken;
    const photoIds =
      data?.album?.photoIds || data?.photos.map((p) => p.id) || [];
    if (!galleryToken || !photoIds.length) {
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
          `/api/public/galleries/${galleryToken}/download`,
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

  const albumPinCopy = downloadCopy("album", {
    count: data.photos.length,
    emphasizePin: design.download.emphasizePin,
  });

  const galleryHref = data.gallery?.publicToken
    ? `/g/${data.gallery.publicToken}`
    : undefined;

  return (
    <PublicShell
      bare
      style={themeStyle}
      galleryMotion={design.motion}
      galleryDensity={design.density}
    >
      <AlbumView
        title={data.album.label}
        subtitle={`${data.galleryTitle || data.gallery?.title || "Gallery"} · ${
          data.studio.name
        } · ${data.photos.length} photo${data.photos.length === 1 ? "" : "s"}`}
        photos={data.photos}
        backHref={galleryHref}
        backLabel="All albums"
        onPhotoClick={(photo) => {
          const idx = data.photos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) setLightboxIndex(idx);
        }}
        headerExtra={<AlbumNav items={navItems} />}
        actions={
          <>
            <AlbumShareButton onShare={() => void shareAlbum()} />
            {data.photos.length ? (
              <Button
                size="sm"
                tone="neutral"
                onClick={() => void startDownload()}
              >
                Download album
              </Button>
            ) : null}
            {galleryHref ? (
              <ButtonLink href={galleryHref} size="sm" tone="ghost">
                Full gallery
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {lightboxIndex != null ? (
        <PhotoLightbox
          photos={data.photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}

      <PinModal
        open={pinOpen}
        onClose={() => {
          setPinOpen(false);
          setPinError(null);
        }}
        onSubmit={runAlbumDownload}
        title={albumPinCopy.title}
        description={albumPinCopy.description}
        footnote={albumPinCopy.footnote}
        confirmLabel={albumPinCopy.confirmLabel}
        error={pinError}
        onClearError={() => setPinError(null)}
      />
    </PublicShell>
  );
}
