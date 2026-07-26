"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlbumView } from "@/components/gallery/AlbumView";
import type { MasonryPhoto } from "@/components/gallery/MasonryGrid";
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox";

type SubAlbumPayload = {
  album: { label: string; token: string };
  galleryTitle: string;
  photos: MasonryPhoto[];
  studio: { name: string };
};

export default function SubAlbumPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<SubAlbumPayload | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/public/subalbums/${token}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => undefined);
  }, [token]);

  if (!data) {
    return (
      <div className="shell-pad py-16 text-center text-muted">
        Loading album…
      </div>
    );
  }

  return (
    <>
      <AlbumView
        title={data.album.label}
        subtitle={`${data.galleryTitle} · ${data.studio.name} · ${
          data.photos.length
        } photo${data.photos.length === 1 ? "" : "s"}`}
        photos={data.photos}
        onPhotoClick={(photo) => {
          const idx = data.photos.findIndex((p) => p.id === photo.id);
          if (idx >= 0) setLightboxIndex(idx);
        }}
      />

      {lightboxIndex != null ? (
        <PhotoLightbox
          photos={data.photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
