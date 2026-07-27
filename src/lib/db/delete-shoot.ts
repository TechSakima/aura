import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { deleteStorageObject } from "@/lib/storage/upload";

export async function deletePhotoFiles(storagePath: string) {
  if (!storagePath.startsWith("studios/")) return;
  const stem = storagePath.replace(/\/originals\/[^/]+$/, "");
  const base = storagePath.split("/").pop()?.replace(/\.jpg$/i, "") || "";
  await Promise.all([
    deleteStorageObject(storagePath).catch(() => undefined),
    deleteStorageObject(`${stem}/derivatives/${base}-thumb.webp`).catch(
      () => undefined,
    ),
    deleteStorageObject(`${stem}/derivatives/${base}-web.webp`).catch(
      () => undefined,
    ),
    deleteStorageObject(`${stem}/derivatives/${base}-wm.webp`).catch(
      () => undefined,
    ),
  ]);
}

/** Delete photos by id and clean storage + related comments. */
export async function deletePhotosByIds(
  studioId: string,
  photoIds: string[],
): Promise<number> {
  if (!photoIds.length) return 0;
  const idSet = new Set(photoIds);
  const db = await readStudioDb(studioId);
  const photos = db.photos.filter((p) => idSet.has(p.id));
  for (const photo of photos) {
    await deletePhotoFiles(photo.storagePath);
  }
  await updateStudioDb(studioId, (d) => {
    d.photos = d.photos.filter((p) => !idSet.has(p.id));
    d.comments = d.comments.filter((c) => !idSet.has(c.photoId));
    for (const g of d.galleries) {
      if (g.favoritePhotoIds?.length) {
        g.favoritePhotoIds = g.favoritePhotoIds.filter((id) => !idSet.has(id));
      }
      if (g.coverPhotoUrl) {
        const coverGone = photos.some(
          (p) =>
            p.galleryId === g.id &&
            (p.thumbUrl === g.coverPhotoUrl ||
              p.webUrl === g.coverPhotoUrl ||
              p.watermarkedUrl === g.coverPhotoUrl),
        );
        if (coverGone) {
          const next = d.photos.find((p) => p.galleryId === g.id);
          g.coverPhotoUrl = next?.watermarkedUrl;
        }
      }
      g.updatedAt = new Date().toISOString();
    }
  });
  return photos.length;
}

/** Remove a shoot and related plans, proposals, galleries, photos, comments. */
export async function deleteShootCascade(
  studioId: string,
  shootId: string,
): Promise<boolean> {
  const db = await readStudioDb(studioId);
  const shoot = db.shoots.find((s) => s.id === shootId);
  if (!shoot) return false;

  const galleries = db.galleries.filter((g) => g.shootId === shootId);
  const galleryIds = new Set(galleries.map((g) => g.id));
  const photos = db.photos.filter((p) => galleryIds.has(p.galleryId));

  for (const photo of photos) {
    await deletePhotoFiles(photo.storagePath);
  }

  await updateStudioDb(studioId, (d) => {
    d.photos = d.photos.filter((p) => !galleryIds.has(p.galleryId));
    d.comments = d.comments.filter((c) => !galleryIds.has(c.galleryId));
    d.subAlbums = d.subAlbums.filter((a) => !galleryIds.has(a.galleryId));
    d.galleries = d.galleries.filter((g) => g.shootId !== shootId);
    d.shootPlans = d.shootPlans.filter((p) => p.shootId !== shootId);
    d.proposals = d.proposals.filter((p) => p.shootId !== shootId);
    d.analyticsEvents = d.analyticsEvents.filter(
      (e) =>
        e.shootId !== shootId &&
        !(e.galleryId && galleryIds.has(e.galleryId)) &&
        !(e.proposalId && shoot.proposalId === e.proposalId),
    );
    d.shoots = d.shoots.filter((s) => s.id !== shootId);
  });

  return true;
}

/** Remove a proposal and unlink it from its shoot. */
export async function deleteProposalCascade(
  studioId: string,
  proposalId: string,
): Promise<boolean> {
  const db = await readStudioDb(studioId);
  const proposal = db.proposals.find((p) => p.id === proposalId);
  if (!proposal) return false;

  await updateStudioDb(studioId, (d) => {
    d.proposals = d.proposals.filter((p) => p.id !== proposalId);
    d.analyticsEvents = d.analyticsEvents.filter(
      (e) => e.proposalId !== proposalId,
    );
    const shoot = d.shoots.find((s) => s.id === proposal.shootId);
    if (shoot) {
      if (shoot.proposalId === proposalId) {
        shoot.proposalId = undefined;
      }
      // Revert booking that came from this proposal (keep if already delivered/archived)
      if (shoot.status === "proposed" || shoot.status === "booked") {
        shoot.status = "inquiry";
      }
      shoot.wizardSkippedProposal = false;
      shoot.updatedAt = new Date().toISOString();
    }
  });

  return true;
}
