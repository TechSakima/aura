"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlbumShareButton,
  AlbumView,
} from "@/components/gallery/AlbumView";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";
import { Button, useToast } from "@/components/ui";

type PeekPhoto = MasonryPhoto & { kind: string };

type GalleryPayload = {
  gallery: { title: string; publicToken: string };
  photos: PeekPhoto[];
  clientName?: string | null;
  studio: { name: string; logoUrl?: string };
};

export default function PeekGalleryPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { push } = useToast();
  const [data, setData] = useState<GalleryPayload | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/galleries/${token}`);
    if (!res.ok) return;
    setData(await res.json());
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const peekPhotos = useMemo(
    () => data?.photos.filter((p) => p.kind === "peek") || [],
    [data],
  );

  async function shareNative() {
    const shareUrl = `${window.location.origin}/g/${token}/peek`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.gallery.title || "Sneak peek",
          text: data?.clientName
            ? `A sneak peek for ${data.clientName}`
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

  if (!data) {
    return (
      <div className="shell-pad py-16 text-center text-muted">
        Loading sneak peek…
      </div>
    );
  }

  return (
    <>
      <AlbumView
        title="Sneak peek"
        subtitle={`${data.gallery.title}${
          data.clientName ? ` · ${data.clientName}` : ""
        } · ${peekPhotos.length} photo${peekPhotos.length === 1 ? "" : "s"}`}
        photos={peekPhotos}
        onPhotoClick={(photo) => {
          const idx = peekPhotos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) setLightboxIndex(idx);
        }}
        emptyMessage="No sneak peek photos yet."
        actions={
          <>
            <AlbumShareButton onShare={() => void shareNative()} />
            <Link href={`/g/${token}`}>
              <Button size="sm" tone="neutral">
                All albums
              </Button>
            </Link>
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
    </>
  );
}
