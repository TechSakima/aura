"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import {
  AlbumShareButton,
  AlbumView,
} from "@/components/gallery/AlbumView";
import { AlbumTile, AlbumTileGrid } from "@/components/gallery/AlbumTile";
import { GalleryHero } from "@/components/gallery/GalleryHero";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
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
import type { Comment, Gallery, PrintPartner } from "@/lib/types";

type PublicPhoto = MasonryPhoto & { kind: string; version: number };

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
    printPartners: PrintPartner[];
  };
  comments: Comment[];
};

type DownloadMode = "all" | "single" | "favorites";
type ViewMode = "hub" | "gallery" | "favorites" | "peek";

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
    () => data?.photos.filter((p) => p.kind === "main") || [],
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
    const pool = [
      ...peekPhotos.map((p) => p.url),
      ...mainPhotos.map((p) => p.url),
    ];
    return pool.slice(0, 8);
  }, [peekPhotos, mainPhotos]);

  const selected =
    lightboxIndex != null ? albumPhotos[lightboxIndex] || null : null;

  async function openPhoto(photo: MasonryPhoto) {
    const idx = albumPhotos.findIndex((p) => p.id === photo.id);
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
    const path = view === "peek" ? `/g/${token}/peek` : `/g/${token}`;
    const absolute = `${window.location.origin}${path}`;
    if (navigator.share && view === "peek") {
      try {
        await navigator.share({
          title: data?.gallery.title || "Gallery",
          text: data?.clientName
            ? `A sneak peek for ${data.clientName}`
            : "A sneak peek from our session",
          url: absolute,
        });
        push("Shared", "success");
        return;
      } catch {
        // cancelled — do not copy
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

  const albumTitle =
    view === "favorites"
      ? "Favorites"
      : view === "peek"
        ? "Sneak peek"
        : "Full gallery";

  if (view !== "hub") {
    return (
      <>
        <AlbumView
          title={albumTitle}
          subtitle={`${albumPhotos.length} photo${
            albumPhotos.length === 1 ? "" : "s"
          }${clientName ? ` · ${clientName}` : ""}`}
          photos={albumPhotos}
          onBack={() => {
            setLightboxIndex(null);
            setView("hub");
          }}
          onPhotoClick={(p) => void openPhoto(p)}
          emptyMessage={
            view === "favorites"
              ? "Heart photos to save favorites."
              : view === "peek"
                ? "No sneak peek photos yet."
                : "No photos in this album yet."
          }
          renderOverlay={
            view === "peek"
              ? undefined
              : (photo) => (
                  <button
                    type="button"
                    aria-label="Toggle favorite"
                    className="rounded-full bg-surface/90 px-2.5 py-1 text-sm shadow-sm"
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
                {view !== "peek" ? (
                  <>
                    <Button
                      size="sm"
                      tone="neutral"
                      onClick={() =>
                        startDownload(
                          view === "favorites" ? "favorites" : "all",
                        )
                      }
                      disabled={view === "favorites" && !favorites.length}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      tone="ghost"
                      onClick={() => setSubOpen(true)}
                    >
                      Share selection
                    </Button>
                  </>
                ) : null}
              </>
            ) : null
          }
        />
        {galleryDialogs()}
      </>
    );
  }

  return (
    <div className="min-h-full bg-canvas text-ink">
      <GalleryHero
        images={heroImages}
        studioName={studio.name}
        studioLogoUrl={studio.logoUrl}
        clientName={clientName}
        title={gallery.title}
        daysLeft={daysLeft}
      />

      <main className="shell-pad mx-auto max-w-[var(--shell-max)] space-y-10 py-10 sm:py-14">
        {expired ? (
          <p className="text-center text-muted">
            This gallery is no longer available.
          </p>
        ) : (
          <>
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-3xl">Albums</h2>
                <p className="mt-1 text-sm text-muted">
                  Choose where to begin
                </p>
              </div>

              <AlbumTileGrid>
                {peekPhotos.length > 0 ? (
                  <AlbumTile
                    onClick={() => setView("peek")}
                    coverUrl={peekPhotos[0]?.thumbUrl || peekPhotos[0]?.url}
                    label="Sneak peek"
                    meta={`${peekPhotos.length} photo${
                      peekPhotos.length === 1 ? "" : "s"
                    } · Share-ready`}
                    featured
                  />
                ) : null}

                <AlbumTile
                  onClick={() => setView("gallery")}
                  coverUrl={
                    mainPhotos[0]?.thumbUrl ||
                    mainPhotos[0]?.url ||
                    gallery.coverPhotoUrl
                  }
                  label="Full gallery"
                  meta={`${mainPhotos.length} photo${
                    mainPhotos.length === 1 ? "" : "s"
                  }`}
                  featured={peekPhotos.length === 0}
                />

                {favorites.length > 0 ? (
                  <AlbumTile
                    onClick={() => setView("favorites")}
                    coverUrl={
                      favoritePhotos[0]?.thumbUrl || favoritePhotos[0]?.url
                    }
                    label="Favorites"
                    meta={`${favorites.length} saved`}
                  />
                ) : null}

                {subAlbums.map((album) => (
                  <AlbumTile
                    key={album.id}
                    href={`/s/${album.token}`}
                    coverUrl={album.coverUrl}
                    label={album.label}
                    meta={`${album.count} photo${
                      album.count === 1 ? "" : "s"
                    }`}
                  />
                ))}

                <AlbumTile
                  onClick={() => setSubOpen(true)}
                  label="Share a selection"
                  meta="Create a private album link"
                />
              </AlbumTileGrid>
            </section>

            <section className="flex flex-wrap gap-2 border-t border-line pt-8">
              <Button onClick={() => startDownload("all")}>Download all</Button>
              <Button
                tone="neutral"
                disabled={!favorites.length}
                onClick={() => startDownload("favorites")}
              >
                Download favorites ({favorites.length})
              </Button>
            </section>

            {subUrl ? (
              <div className="rounded-md border border-line bg-surface p-4 text-sm">
                Shared album ready:{" "}
                <Link href={subUrl} className="text-accent">
                  Open link
                </Link>
              </div>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="shell-pad mx-auto flex max-w-[var(--shell-max)] flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium text-ink">{studio.name}</p>
            {studio.brandTagline ? (
              <p className="mt-1">{studio.brandTagline}</p>
            ) : null}
          </div>
          {studio.printPartners.length > 0 ? (
            <div className="sm:text-right">
              <p className="mb-2 text-xs uppercase tracking-wider">Print with</p>
              <ul className="space-y-1">
                {studio.printPartners.map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent"
                    >
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </footer>

      {galleryDialogs()}
    </div>
  );

  function galleryDialogs() {
    return (
      <>
        {lightboxIndex != null ? (
          <PhotoLightbox
            photos={albumPhotos}
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
                            ? "Remove favorite"
                            : "Favorite"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {gallery.commentsEnabled && view !== "peek" ? (
                    <div className="space-y-3 border-t border-surface/15 pt-3">
                      <h3 className="text-sm font-medium">Comments</h3>
                      {photoComments.map((c) => (
                        <div key={c.id} className="text-sm">
                          <p className="font-medium">{c.authorName}</p>
                          <p className="text-surface/70">{c.body}</p>
                        </div>
                      ))}
                      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
                        <Input
                          placeholder="Your name"
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
              ) : undefined
            }
          />
        ) : null}

        <PinModal
          open={pinOpen}
          onClose={() => setPinOpen(false)}
          onSubmit={handleDownload}
          title={
            downloadMode === "favorites"
              ? "Download favorites"
              : downloadMode === "single"
                ? "Download photo"
                : "Download gallery"
          }
        />

        <Dialog
          open={subOpen}
          onClose={() => setSubOpen(false)}
          title="Share a selection"
        >
          <div className="space-y-4">
            <Field>
              <Label htmlFor="sublabel">Album name</Label>
              <Input
                id="sublabel"
                value={subLabel}
                onChange={(e) => setSubLabel(e.target.value)}
                placeholder="Family favorites"
              />
            </Field>
            <p className="text-sm text-muted">
              Select photos to include ({subSelected.length} selected).
            </p>
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
              {mainPhotos.map((p) => {
                const on = subSelected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setSubSelected((prev) =>
                        on
                          ? prev.filter((id) => id !== p.id)
                          : [...prev, p.id],
                      )
                    }
                    className={`overflow-hidden rounded-md border-2 ${
                      on ? "border-accent" : "border-line"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumbUrl || p.url}
                      alt=""
                      className="aspect-square object-cover"
                    />
                  </button>
                );
              })}
            </div>
            <Button
              disabled={!subSelected.length}
              onClick={() => void createSubAlbum()}
            >
              Create share link
            </Button>
          </div>
        </Dialog>
      </>
    );
  }
}
