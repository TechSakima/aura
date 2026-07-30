import { COL, TENANT_COLLECTIONS } from "@/lib/db/collections";
import { clearHomepageSlugIndex } from "@/lib/db/homepage-slug";
import {
  deleteSessionsForUid,
  deleteStudioDocs,
  readStudioDb,
} from "@/lib/db/store";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { deleteFavoritesForGalleries } from "@/lib/gallery-favorites";
import { deletePhotoFiles } from "@/lib/db/delete-shoot";
import { deleteStorageObject } from "@/lib/storage/upload";

/**
 * Permanently delete a studio workspace (AURA-348).
 * Intentional O(studio) — admin danger action only.
 */
export async function deleteStudioCascade(opts: {
  studioId: string;
  ownerUid: string;
}): Promise<void> {
  const { studioId, ownerUid } = opts;
  const workspace = await readStudioDb(studioId);

  for (const photo of workspace.photos) {
    await deletePhotoFiles(photo.storagePath).catch(() => undefined);
  }

  const brandPaths = [
    workspace.studio.logoUrl,
    workspace.studio.coverLogoUrl,
    workspace.studio.defaultCoverImageUrl,
  ];
  for (const url of brandPaths) {
    if (!url) continue;
    const path = storagePathFromMediaUrl(url);
    if (path) await deleteStorageObject(path).catch(() => undefined);
  }

  await deleteFavoritesForGalleries(workspace.galleries.map((g) => g.id));
  await clearHomepageSlugIndex(workspace.studio.homepage?.slug);

  for (const collection of TENANT_COLLECTIONS) {
    const ids = idsForCollection(workspace, collection);
    await deleteStudioDocs(collection, ids);
  }
  // Legacy dual collections
  await deleteStudioDocs(
    COL.clients,
    workspace.clients?.map((c) => c.id) || workspace.projects.map((p) => p.id),
  );
  await deleteStudioDocs(
    COL.shoots,
    workspace.shoots?.map((s) => s.id) || workspace.sessions.map((s) => s.id),
  );

  const { db } = assertFirebaseReady();
  const membersSnap = await db
    .collection(COL.studioMembers)
    .where("studioId", "==", studioId)
    .get();
  const memberUids = membersSnap.docs.map((d) => d.id);
  if (!memberUids.includes(ownerUid)) memberUids.push(ownerUid);

  for (const uid of memberUids) {
    await deleteSessionsForUid(uid);
    await db.collection(COL.studioMembers).doc(uid).delete().catch(() => undefined);
  }

  await db.collection(COL.studios).doc(studioId).delete();
}

function storagePathFromMediaUrl(url: string): string | null {
  if (url.startsWith("studios/")) return url;
  const marker = "/api/media/";
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    const path = decodeURIComponent(url.slice(idx + marker.length));
    return path.startsWith("studios/") ? path : null;
  }
  return null;
}

function idsForCollection(
  workspace: Awaited<ReturnType<typeof readStudioDb>>,
  collection: string,
): string[] {
  switch (collection) {
    case COL.projects:
      return workspace.projects.map((x) => x.id);
    case COL.projectSessions:
      return workspace.sessions.map((x) => x.id);
    case COL.packageTemplates:
      return workspace.packageTemplates.map((x) => x.id);
    case COL.proposals:
      return workspace.proposals.map((x) => x.id);
    case COL.galleries:
      return workspace.galleries.map((x) => x.id);
    case COL.photos:
      return workspace.photos.map((x) => x.id);
    case COL.comments:
      return workspace.comments.map((x) => x.id);
    case COL.subAlbums:
      return workspace.subAlbums.map((x) => x.id);
    case COL.watermarkPresets:
      return workspace.watermarkPresets.map((x) => x.id);
    case COL.analyticsEvents:
      return workspace.analyticsEvents.map((x) => x.id);
    case COL.ideaCards:
      return workspace.ideaCards.map((x) => x.id);
    case COL.shotListTemplates:
      return workspace.shotListTemplates.map((x) => x.id);
    case COL.shootPlans:
      return workspace.shootPlans.map((x) => x.id);
    case COL.notifications:
      return workspace.notifications.map((x) => x.id);
    case COL.paymentLinks:
      return workspace.paymentLinks.map((x) => x.id);
    case COL.invoices:
      return workspace.invoices.map((x) => x.id);
    case COL.paymentTransactions:
      return workspace.paymentTransactions.map((x) => x.id);
    case COL.contractTemplates:
      return workspace.contractTemplates.map((x) => x.id);
    case COL.contracts:
      return workspace.contracts.map((x) => x.id);
    case COL.questionnaireTemplates:
      return workspace.questionnaireTemplates.map((x) => x.id);
    case COL.questionnaireResponses:
      return workspace.questionnaireResponses.map((x) => x.id);
    case COL.sessionTypes:
      return workspace.sessionTypes.map((x) => x.id);
    case COL.bookingRequests:
      return workspace.bookingRequests.map((x) => x.id);
    default:
      return [];
  }
}
