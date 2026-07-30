import { COL } from "@/lib/db/collections";
import {
  deleteStudioDocs,
  readStudioDb,
  updateStudioDb,
  updateStudioDoc,
} from "@/lib/db/store";
import { derivativePathsToDelete } from "@/lib/images/storage-paths";
import { deleteGoogleCalendarEvent } from "@/lib/google-calendar";
import { deleteStorageObject } from "@/lib/storage/upload";
import { deleteFavoritesForGalleries } from "@/lib/gallery-favorites";
import type { BookingRequest, ProjectSession } from "@/lib/types";

export async function deletePhotoFiles(storagePath: string) {
  if (!storagePath.startsWith("studios/")) return;
  await Promise.all([
    deleteStorageObject(storagePath).catch(() => undefined),
    ...derivativePathsToDelete(storagePath).map((p) =>
      deleteStorageObject(p).catch(() => undefined),
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
  const commentIds = db.comments
    .filter((c) => idSet.has(c.photoId))
    .map((c) => c.id);

  await deleteStudioDocs(COL.photos, photoIds, { studioId });
  await deleteStudioDocs(COL.comments, commentIds, { studioId });

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

/** Remove a session/shoot and related plans, quotes, galleries, photos. */
export async function deleteShootCascade(
  studioId: string,
  shootId: string,
): Promise<boolean> {
  const db = await readStudioDb(studioId);
  const session = db.sessions.find(
    (s) => s.id === shootId && s.studioId === studioId,
  );
  if (!session) return false;

  const googleEventId = session.googleEventId?.trim() || undefined;

  const galleries = db.galleries.filter((g) => {
    const sid = g.sessionId || g.shootId;
    if (sid === shootId) return true;
    if (session.galleryId && g.id === session.galleryId) return true;
    return false;
  });
  const galleryIds = new Set(galleries.map((g) => g.id));
  const photos = db.photos.filter((p) => galleryIds.has(p.galleryId));
  const proposalIds = new Set(
    db.proposals
      .filter((p) => (p.sessionId || p.shootId) === shootId)
      .map((p) => p.id),
  );
  if (session.proposalId) proposalIds.add(session.proposalId);

  for (const photo of photos) {
    await deletePhotoFiles(photo.storagePath);
  }

  const commentIds = db.comments
    .filter((c) => galleryIds.has(c.galleryId))
    .map((c) => c.id);
  const subAlbumIds = db.subAlbums
    .filter((a) => galleryIds.has(a.galleryId))
    .map((a) => a.id);
  const planIds = db.shootPlans
    .filter((p) => p.sessionId === shootId || p.shootId === shootId)
    .map((p) => p.id);
  const eventIds = db.analyticsEvents
    .filter(
      (e) =>
        e.sessionId === shootId ||
        e.shootId === shootId ||
        (e.galleryId && galleryIds.has(e.galleryId)) ||
        (e.proposalId && proposalIds.has(e.proposalId)),
    )
    .map((e) => e.id);
  const bookingIds = db.bookingRequests
    .filter((b) => b.sessionId === shootId)
    .map((b) => b.id);

  const del = { studioId };
  await deleteStudioDocs(
    COL.photos,
    photos.map((p) => p.id),
    del,
  );
  await deleteStudioDocs(COL.comments, commentIds, del);
  await deleteStudioDocs(COL.subAlbums, subAlbumIds, del);
  await deleteStudioDocs(COL.galleries, [...galleryIds], del);
  await deleteFavoritesForGalleries([...galleryIds]);
  await deleteStudioDocs(COL.shootPlans, planIds, del);
  await deleteStudioDocs(COL.proposals, [...proposalIds], del);
  await deleteStudioDocs(COL.analyticsEvents, eventIds, del);
  await deleteStudioDocs(COL.projectSessions, [shootId], del);
  await deleteStudioDocs(COL.shoots, [shootId], del);

  // Unlink + reconcile booking status (AURA-100) — pending/confirmed must not
  // stay actionable after the session is gone.
  const now = new Date().toISOString();
  for (const bookingId of bookingIds) {
    await updateStudioDoc<BookingRequest>(
      COL.bookingRequests,
      bookingId,
      (b) => {
        if (b.sessionId !== shootId) return b;
        b.sessionId = undefined;
        if (b.status === "pending" || b.status === "confirmed") {
          b.status = "canceled";
          b.cancelReason = b.cancelReason?.trim() || "Session deleted";
        }
        b.updatedAt = now;
        return b;
      },
    );
  }

  if (googleEventId) {
    await deleteGoogleCalendarEvent({
      studioId,
      eventId: googleEventId,
    }).catch(() => undefined);
  }

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

  const eventIds = db.analyticsEvents
    .filter((e) => e.proposalId === proposalId)
    .map((e) => e.id);

  await deleteStudioDocs(COL.proposals, [proposalId], { studioId });
  await deleteStudioDocs(COL.analyticsEvents, eventIds, { studioId });

  const sessionId = proposal.sessionId || proposal.shootId;
  if (sessionId) {
    await updateStudioDoc<ProjectSession>(
      COL.projectSessions,
      sessionId,
      (session) => {
        if (session.proposalId === proposalId) {
          session.proposalId = undefined;
        }
        if (session.status === "proposed" || session.status === "booked") {
          session.status = "inquiry";
        }
        session.wizardSkippedProposal = false;
        session.updatedAt = new Date().toISOString();
        return session;
      },
    );
  }

  return true;
}
