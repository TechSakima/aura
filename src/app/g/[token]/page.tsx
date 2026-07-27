"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import {
  AlbumShareButton,
  AlbumView,
} from "@/components/gallery/AlbumView";
import { GalleryHero } from "@/components/gallery/GalleryHero";
import { MasonryGrid, type MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { PinModal } from "@/components/gallery/PinModal";
import {
  Button,
  Dialog,
  Field,
  Input,
  Label,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import type { Comment, Gallery } from "@/lib/types";

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
  gallery: Gallery;
  photos: PublicPhoto[];
  clientName?: string | null;
  subAlbums: SubAlbumSummary[];
  studio: {
    name: string;
    logoUrl?: string;
    brandTagline?: string;
  };
  comments: Comment[];
};

type DownloadMode = "all" | "single" | "favorites";
type ViewMode = "hub" | "favorites" | "peek";

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center text-ink/80 transition hover:text-ink"
    >
      {children}
    </button>
  );
}

export default function PublicGalleryPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { alert } = useConfirm();
  const { push } = useToast();
  const [data, setData] = useState<GalleryPayload | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("hub");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("all");
  const [downloadPhotoId, setDownloadPhotoId] = useState<string | null>(null);
  const [commentName, setCommentName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [subSelected, setSubSelected] = useState<string[]>([]);
  const [subUrl, setSubUrl] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/galleries/${token}`);
    if (!res.ok) {
      setError("Gallery not found.");
      return;
    }
    const json = (await res.json()) as GalleryPayload;
    setData(json);
    setFavorites(json.gallery.favoritePhotoIds || []);
  }, [token]);

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
    const res = await fetch(`/api/public/galleries/${token}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    if (res.ok) {
      const json = await res.json();
      setFavorites(json.favoritePhotoIds || []);
    }
  }

  function startDownload(mode: DownloadMode, photoId?: string) {
    setDownloadMode(mode);
    setDownloadPhotoId(
      mode === "single" ? photoId || selected?.id || null : null,
    );
    setPinOpen(true);
  }

  async function handleDownload(pin: string) {
    const body: Record<string, string> = { pin };
    if (downloadMode === "single" && downloadPhotoId) {
      body.photoId = downloadPhotoId;
    } else if (downloadMode === "favorites") {
      body.mode = "favorites";
    }

    const res = await fetch(`/api/public/galleries/${token}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Download failed" }));
      await alert({
        title: "Download failed",
        message: String(err.error || "Download failed"),
      });
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = downloadMode === "single" ? "jpg" : "zip";
    a.download = `${data?.gallery.title || "gallery"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setPinOpen(false);
  }

  async function submitComment() {
    if (!selected || !commentBody.trim()) return;
    await fetch(`/api/public/galleries/${token}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoId: selected.id,
        authorName: commentName || "Guest",
        body: commentBody,
      }),
    });
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
    if (res.ok) {
      const json = await res.json();
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
  }

  async function shareAlbum() {
    const absolute = `${window.location.origin}/g/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.gallery.title || "Gallery",
          text: data?.clientName
            ? `Photos for ${data.clientName}`
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

  if (error) {
    return (
      <div className="shell-pad py-16 text-center text-muted">{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="shell-pad py-16 text-center text-muted">
        Loading gallery…
      </div>
    );
  }

  const { gallery, studio, comments, clientName, subAlbums } = data;
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

  const design = gallery.design;
  const coverStyle = design?.coverStyle || "full";
  const themeId = design?.themeId || "echo";
  const gridMode = design?.gridMode || "masonry";
  const pageBg = design?.background || "#f7f5f1";
  const pageAccent = design?.accent || "#1c1915";

  const dateLabel = gallery.liveAt
    ? format(new Date(gallery.liveAt), "MMMM do, yyyy").toUpperCase()
    : gallery.createdAt
      ? format(new Date(gallery.createdAt), "MMMM do, yyyy").toUpperCase()
      : null;

  const chrome = (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-[color:var(--gallery-page-bg)]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide text-ink">
            {gallery.title}
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted">
            {studio.name}
          </p>
        </div>
        {!expired ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {favorites.length > 0 ? (
              <IconButton
                label="Favorites"
                onClick={() => setView("favorites")}
              >
                ♥
              </IconButton>
            ) : (
              <IconButton
                label="Favorites"
                onClick={() => setView("favorites")}
              >
                ♡
              </IconButton>
            )}
            <IconButton
              label="Download"
              onClick={() => startDownload("all")}
            >
              ↓
            </IconButton>
            <IconButton label="Share" onClick={() => void shareAlbum()}>
              ↗
            </IconButton>
            {peekPhotos.length > 0 ? (
              <IconButton
                label="Sneak peek"
                onClick={() => setView("peek")}
              >
                ◌
              </IconButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );

  if (view === "favorites" || view === "peek") {
    return (
      <div
        className="min-h-full text-ink"
        style={
          {
            ["--gallery-page-bg" as string]: pageBg,
            background: pageBg,
            ["--color-accent" as string]: pageAccent,
        } as CSSProperties
      }
    >
      {chrome}
        <AlbumView
          title={view === "favorites" ? "Favorites" : "Sneak peek"}
          subtitle={`${albumPhotos.length} photos`}
          photos={albumPhotos}
          onBack={() => {
            setLightboxIndex(null);
            setView("hub");
          }}
          onPhotoClick={(p) => void openPhoto(p, albumPhotos)}
          emptyMessage={
            view === "favorites"
              ? "Heart photos to save favorites."
              : "No sneak peek photos yet."
          }
          renderOverlay={
            view === "peek"
              ? undefined
              : (photo) => (
                  <button
                    type="button"
                    aria-label="Toggle favorite"
                    className="bg-surface/90 px-2 py-1 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleFavorite(photo.id);
                    }}
                  >
                    {favorites.includes(photo.id) ? "♥" : "♡"}
                  </button>
                )
          }
          actions={
            !expired ? (
              <>
                <AlbumShareButton onShare={() => void shareAlbum()} />
                {view === "favorites" ? (
                  <Button
                    size="sm"
                    tone="neutral"
                    onClick={() => startDownload("favorites")}
                    disabled={!favorites.length}
                  >
                    Download
                  </Button>
                ) : null}
              </>
            ) : null
          }
        />
        {galleryDialogs()}
      </div>
    );
  }

  return (
    <div
      className="min-h-full text-ink"
      style={
        {
          ["--gallery-page-bg" as string]: pageBg,
          background: pageBg,
          ["--color-accent" as string]: pageAccent,
        } as CSSProperties
      }
    >
      {chrome}

      {coverStyle !== "none" ? (
        <GalleryHero
          images={
            coverStyle === "third" ? heroImages.slice(0, 1) : heroImages
          }
          title={gallery.title}
          dateLabel={dateLabel}
          daysLeft={daysLeft}
          compact={coverStyle === "third"}
          themeId={themeId}
          coverFocalX={design?.coverFocalX}
          coverFocalY={design?.coverFocalY}
          onViewGallery={expired ? undefined : scrollToPhotos}
        />
      ) : (
        <div className="mx-auto max-w-[1400px] px-4 py-16 text-center sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
            {dateLabel}
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-[0.14em] sm:text-6xl">
            {gallery.title}
          </h1>
          {!expired ? (
            <button
              type="button"
              onClick={scrollToPhotos}
              className="mt-8 border border-ink px-6 py-2.5 text-[11px] uppercase tracking-[0.22em] transition hover:bg-ink hover:text-surface"
            >
              View gallery
            </button>
          ) : null}
        </div>
      )}

      <main id="photos" className="mx-auto max-w-[1600px] scroll-mt-16 px-0 py-0 sm:px-0">
        {expired ? (
          <p className="py-16 text-center text-muted">
            This gallery is no longer available.
          </p>
        ) : (
          <>
            <div className="px-0 pt-0">
            <MasonryGrid
              photos={mainPhotos}
              gridMode={gridMode}
              onPhotoClick={(p) => void openPhoto(p, mainPhotos)}
              hoverActions={(photo) => (
                <>
                  <button
                    type="button"
                    aria-label="Favorite"
                    className="inline-flex h-8 w-8 items-center justify-center text-sm text-ink/80 hover:text-ink"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleFavorite(photo.id);
                    }}
                  >
                    {favorites.includes(photo.id) ? "♥" : "♡"}
                  </button>
                  <button
                    type="button"
                    aria-label="Download"
                    className="inline-flex h-8 w-8 items-center justify-center text-sm text-ink/80 hover:text-ink"
                    onClick={(e) => {
                      e.stopPropagation();
                      startDownload("single", photo.id);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Share selection"
                    className="inline-flex h-8 w-8 items-center justify-center text-sm text-ink/80 hover:text-ink"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubSelected([photo.id]);
                      setSubOpen(true);
                    }}
                  >
                    ↗
                  </button>
                </>
              )}
            />
            </div>

            {subAlbums.length > 0 ? (
              <ul className="mx-auto mt-12 flex max-w-[1400px] flex-wrap gap-6 border-t border-ink/10 px-4 pt-10 text-sm sm:px-8">
                {subAlbums.map((album) => (
                  <li key={album.id}>
                    <Link href={`/s/${album.token}`} className="text-accent">
                      {album.label}
                      <span className="text-muted"> · {album.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {clientName ? (
              <p className="mt-10 px-4 pb-6 text-center text-xs uppercase tracking-[0.18em] text-muted sm:px-8">
                For {clientName}
              </p>
            ) : null}

            {subUrl ? (
              <div className="mt-6 px-4 pb-6 text-center text-sm sm:px-8">
                Shared album ready:{" "}
                <Link href={subUrl} className="text-accent">
                  Open link
                </Link>
              </div>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-ink/10 py-10 text-center text-sm text-muted">
        <p className="font-medium text-ink">{studio.name}</p>
        {studio.brandTagline ? (
          <p className="mt-1">{studio.brandTagline}</p>
        ) : null}
      </footer>

      {galleryDialogs()}
    </div>
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
                          onClick={() => startDownload("single", selected.id)}
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          tone="ghost"
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
                    <div className="space-y-2">
                      {photoComments.map((c) => (
                        <p key={c.id} className="text-sm text-surface/80">
                          <span className="font-medium">{c.authorName}</span>:{" "}
                          {c.body}
                        </p>
                      ))}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="Name"
                          value={commentName}
                          onChange={(e) => setCommentName(e.target.value)}
                        />
                        <Input
                          placeholder="Comment"
                          value={commentBody}
                          onChange={(e) => setCommentBody(e.target.value)}
                        />
                        <Button size="sm" onClick={() => void submitComment()}>
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

        <PinModal
          open={pinOpen}
          onClose={() => setPinOpen(false)}
          onSubmit={(pin) => void handleDownload(pin)}
        />

        <Dialog
          open={subOpen}
          onClose={() => setSubOpen(false)}
          title="Share a selection"
        >
          <div className="space-y-4">
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
