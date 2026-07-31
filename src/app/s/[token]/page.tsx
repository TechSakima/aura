import { redirect, notFound } from "next/navigation";
import { findSubAlbumByToken, getGalleryById } from "@/lib/db/store";
import { subAlbumHref } from "@/lib/public-gallery-paths";

/** Legacy `/s/{album}` → `/g/{gallery}/s/{album}` (AURA-434). */
export default async function LegacySubAlbumRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const album = await findSubAlbumByToken(token);
  if (!album?.galleryId) notFound();
  const gallery = await getGalleryById(album.galleryId);
  const hub = gallery?.publicToken?.trim();
  if (!hub) notFound();
  redirect(subAlbumHref(hub, album.token));
}
