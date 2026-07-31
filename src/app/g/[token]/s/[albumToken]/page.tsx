"use client";

import { useParams } from "next/navigation";
import { SubAlbumClient } from "@/components/gallery/SubAlbumClient";

/** Sub-album under gallery path — stays in `/g/` PWA + SW scope (AURA-434). */
export default function GallerySubAlbumPage() {
  const params = useParams<{ token: string; albumToken: string }>();
  return (
    <SubAlbumClient
      galleryToken={params.token}
      albumToken={params.albumToken}
    />
  );
}
