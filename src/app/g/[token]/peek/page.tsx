"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { AlbumNav, type AlbumNavItem } from "@/components/gallery/AlbumNav";
import {
  AlbumShareButton,
  AlbumView,
} from "@/components/gallery/AlbumView";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { GalleryContactDialog } from "@/components/gallery/GalleryContactDialog";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, EmptyState, useToast } from "@/components/ui";
import { resolveGalleryBrandCssVars } from "@/lib/gallery-brand";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import type { GalleryDesign, StudioTheme } from "@/lib/types";

type PeekPhoto = MasonryPhoto & { kind: string };

type GalleryPayload = {
  gallery: { title: string; publicToken: string; design?: GalleryDesign };
  photos: PeekPhoto[];
  clientName?: string | null;
  projectName?: string | null;
  subAlbums?: { id: string; token: string; label: string; count: number }[];
  studio: {
    name: string;
    logoUrl?: string;
    theme?: StudioTheme;
    showGalleryContactForm?: boolean;
  };
};

export default function PeekGalleryPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { push } = useToast();
  const [data, setData] = useState<GalleryPayload | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/galleries/${token}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(String(json.error || "Gallery not found"));
      return;
    }
    setData(json as GalleryPayload);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const peekPhotos = useMemo(
    () => data?.photos.filter((p) => p.kind === "peek") || [],
    [data],
  );

  const navItems = useMemo((): AlbumNavItem[] => {
    if (!data) return [];
    const items: AlbumNavItem[] = [
      {
        id: "hub",
        label: "All photos",
        href: `/g/${token}`,
      },
      {
        id: "peek",
        label: "Sneak peek",
        href: `/g/${token}/peek`,
        active: true,
      },
    ];
    for (const a of data.subAlbums || []) {
      items.push({
        id: a.token,
        label: a.label,
        href: `/s/${a.token}`,
      });
    }
    return items;
  }, [data, token]);

  const design = useMemo(
    () => normalizeGalleryDesign(data?.gallery.design),
    [data?.gallery.design],
  );
  const themeStyle = useMemo(
    () =>
      resolveGalleryBrandCssVars(design, data?.studio.theme) as CSSProperties,
    [design, data?.studio.theme],
  );

  async function shareNative() {
    const shareUrl = `${window.location.origin}/g/${token}/peek`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.gallery.title || "Sneak peek",
          text: data?.projectName || data?.clientName
            ? `A sneak peek for ${data.projectName || data.clientName}`
            : "A sneak peek from our session",
          url: shareUrl,
        });
        push("Shared", "success");
      } catch {
        // cancelled
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

  if (error) {
    return (
      <PublicShell>
        <EmptyState
          variant="error"
          title={error}
          className="items-center text-center"
        />
      </PublicShell>
    );
  }

  if (!data) {
    return (
      <PublicShell>
        <EmptyState
          variant="loading"
          title="Loading sneak peek…"
          className="py-16 text-center"
        />
      </PublicShell>
    );
  }

  const showGalleryContact = Boolean(data.studio.showGalleryContactForm);

  return (
    <PublicShell
      bare
      style={themeStyle}
      galleryMotion={design.motion}
      galleryDensity={design.density}
    >
      <AlbumView
        title="Sneak peek"
        subtitle={`${data.gallery.title}${
          data.projectName || data.clientName
            ? ` · ${data.projectName || data.clientName}`
            : ""
        } · ${peekPhotos.length} photo${peekPhotos.length === 1 ? "" : "s"}`}
        photos={peekPhotos}
        backHref={`/g/${token}`}
        backLabel="All albums"
        onPhotoClick={(photo) => {
          const idx = peekPhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) setLightboxIndex(idx);
        }}
        emptyMessage="No sneak peek photos yet."
        headerExtra={<AlbumNav items={navItems} />}
        actions={
          <>
            <AlbumShareButton onShare={() => void shareNative()} />
            {showGalleryContact ? (
              <Button
                size="sm"
                tone="ghost"
                className="min-h-11"
                onClick={() => setContactOpen(true)}
              >
                Message
              </Button>
            ) : null}
          </>
        }
      />

      {lightboxIndex != null ? (
        <PhotoLightbox
          photos={peekPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}

      {showGalleryContact ? (
        <GalleryContactDialog
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          token={token}
          studioName={data.studio.name}
          galleryTitle={data.gallery.title}
        />
      ) : null}
    </PublicShell>
  );
}
