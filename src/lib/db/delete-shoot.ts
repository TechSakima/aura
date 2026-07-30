import { COL } from "@/lib/db/collections";
import {
  deleteStudioDocs,
  readStudioDb,
  updateStudioDb,
  updateStudioDoc,
} from "@/lib/db/store";
import { deleteStorageObject } from "@/lib/storage/upload";
import { deleteFavoritesForGalleries } from "@/lib/gallery-favorites";
import type { ProjectSession } from "@/lib/types";

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
  const commentIds = db.comments
    .filter((c) => idSet.has(c.photoId))
    .map((c) => c.id);

  await deleteStudioDocs(COL.photos, photoIds);
  await deleteStudioDocs(COL.comments, commentIds);

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

  await deleteStudioDocs(
    COL.photos,
    photos.map((p) => p.id),
  );
  await deleteStudioDocs(COL.comments, commentIds);
  await deleteStudioDocs(COL.subAlbums, subAlbumIds);
  await deleteStudioDocs(COL.galleries, [...galleryIds]);
  await deleteFavoritesForGalleries([...galleryIds]);
  await deleteStudioDocs(COL.shootPlans, planIds);
  await deleteStudioDocs(COL.proposals, [...proposalIds]);
  await deleteStudioDocs(COL.analyticsEvents, eventIds);
  await deleteStudioDocs(COL.projectSessions, [shootId]);
  await deleteStudioDocs(COL.shoots, [shootId]);

  await updateStudioDb(studioId, (d) => {
    d.photos = d.photos.filter((p) => !galleryIds.has(p.galleryId));
    d.comments = d.comments.filter((c) => !galleryIds.has(c.galleryId));
    d.subAlbums = d.subAlbums.filter((a) => !galleryIds.has(a.galleryId));
    d.galleries = d.galleries.filter((g) => !galleryIds.has(g.id));
    d.shootPlans = d.shootPlans.filter(
      (p) => p.sessionId !== shootId && p.shootId !== shootId,
    );
    d.proposals = d.proposals.filter((p) => !proposalIds.has(p.id));
    d.analyticsEvents = d.analyticsEvents.filter(
      (e) =>
        e.sessionId !== shootId &&
        e.shootId !== shootId &&
        !(e.galleryId && galleryIds.has(e.galleryId)) &&
        !(e.proposalId && proposalIds.has(e.proposalId)),
    );
    for (const b of d.bookingRequests) {
      if (b.sessionId === shootId) {
        b.sessionId = undefined;
        b.updatedAt = new Date().toISOString();
      }
    }
    d.sessions = d.sessions.filter((s) => s.id !== shootId);
    d.shoots = d.sessions.map((s) => ({
      ...s,
      clientId: s.projectId,
      shootDate: s.startsAt,
    }));
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

  const eventIds = db.analyticsEvents
    .filter((e) => e.proposalId === proposalId)
    .map((e) => e.id);

  await deleteStudioDocs(COL.proposals, [proposalId]);
  await deleteStudioDocs(COL.analyticsEvents, eventIds);

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

  await updateStudioDb(studioId, (d) => {
    d.proposals = d.proposals.filter((p) => p.id !== proposalId);
    d.analyticsEvents = d.analyticsEvents.filter(
      (e) => e.proposalId !== proposalId,
    );
    const session = d.sessions.find(
      (s) => s.id === (proposal.sessionId || proposal.shootId),
    );
    if (session) {
      if (session.proposalId === proposalId) {
        session.proposalId = undefined;
      }
      if (session.status === "proposed" || session.status === "booked") {
        session.status = "inquiry";
      }
      session.wizardSkippedProposal = false;
      session.updatedAt = new Date().toISOString();
    }
  });

  return true;
}
