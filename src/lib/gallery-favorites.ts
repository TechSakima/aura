import { createHash, randomBytes } from "crypto";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";

export const VISITOR_COOKIE = "aura_visitor";

export type GalleryVisitorFavorites = {
  id: string;
  studioId: string;
  galleryId: string;
  visitorId: string;
  photoIds: string[];
  updatedAt: string;
  /** Set when visitor submits selects for studio review (AURA-248). */
  submittedAt?: string;
};

export type GallerySelectSubmission = {
  id: string;
  visitorId: string;
  photoIds: string[];
  submittedAt: string;
  updatedAt: string;
  count: number;
};

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function favoritesDocId(galleryId: string, visitorId: string): string {
  return createHash("sha256")
    .update(`${galleryId}:${visitorId}`)
    .digest("hex")
    .slice(0, 40);
}

export function parseVisitorIdFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`),
  );
  const raw = match?.[1] ? decodeURIComponent(match[1]) : "";
  if (!raw || raw.length < 8 || raw.length > 80) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  return raw;
}

export function newVisitorId(): string {
  return randomBytes(18).toString("base64url");
}

export function visitorCookieHeader(visitorId: string): string {
  const maxAge = 60 * 60 * 24 * 400; // ~13 months
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${VISITOR_COOKIE}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`;
}

export async function getVisitorFavoritesDoc(
  galleryId: string,
  visitorId: string,
): Promise<GalleryVisitorFavorites | null> {
  const { db } = assertFirebaseReady();
  const id = favoritesDocId(galleryId, visitorId);
  const snap = await db.collection(COL.galleryFavorites).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as GalleryVisitorFavorites;
  return {
    id: snap.id,
    studioId: data.studioId,
    galleryId: data.galleryId,
    visitorId: data.visitorId,
    photoIds: Array.isArray(data.photoIds)
      ? data.photoIds.map(String)
      : [],
    updatedAt: data.updatedAt || "",
    submittedAt: data.submittedAt,
  };
}

export async function getVisitorFavorites(
  galleryId: string,
  visitorId: string,
): Promise<string[]> {
  const doc = await getVisitorFavoritesDoc(galleryId, visitorId);
  return doc?.photoIds || [];
}

export async function setVisitorFavorites(opts: {
  studioId: string;
  galleryId: string;
  visitorId: string;
  photoIds: string[];
  /** Preserve existing submittedAt unless explicitly cleared. */
  submittedAt?: string | null;
}): Promise<GalleryVisitorFavorites> {
  const { db } = assertFirebaseReady();
  const id = favoritesDocId(opts.galleryId, opts.visitorId);
  const existing = await getVisitorFavoritesDoc(opts.galleryId, opts.visitorId);
  const unique = [...new Set(opts.photoIds.map(String))];
  let submittedAt: string | undefined;
  if (opts.submittedAt === null) {
    submittedAt = undefined;
  } else if (typeof opts.submittedAt === "string") {
    submittedAt = opts.submittedAt;
  } else {
    submittedAt = existing?.submittedAt;
  }
  const doc: GalleryVisitorFavorites = {
    id,
    studioId: opts.studioId,
    galleryId: opts.galleryId,
    visitorId: opts.visitorId,
    photoIds: unique,
    updatedAt: new Date().toISOString(),
    ...(submittedAt ? { submittedAt } : {}),
  };
  await db.collection(COL.galleryFavorites).doc(id).set(stripUndefined(doc));
  return doc;
}

/** Thrown for expected toggle failures (limit / already submitted). */
export class FavoritesToggleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FavoritesToggleError";
  }
}

/**
 * Atomic heart toggle — Firestore txn so concurrent taps cannot drop ids (AURA-406).
 */
export async function toggleVisitorFavorite(opts: {
  studioId: string;
  galleryId: string;
  visitorId: string;
  photoId: string;
  selectLimit?: number | null;
}): Promise<{ doc: GalleryVisitorFavorites; toggledOn: boolean }> {
  const { db } = assertFirebaseReady();
  const id = favoritesDocId(opts.galleryId, opts.visitorId);
  const ref = db.collection(COL.galleryFavorites).doc(id);
  const photoId = String(opts.photoId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists
      ? (snap.data() as GalleryVisitorFavorites)
      : null;
    if (data?.submittedAt) {
      throw new FavoritesToggleError("Selects already submitted");
    }
    const current = Array.isArray(data?.photoIds)
      ? data.photoIds.map(String)
      : [];
    const has = current.includes(photoId);
    let next: string[];
    let toggledOn: boolean;
    if (has) {
      next = current.filter((pid) => pid !== photoId);
      toggledOn = false;
    } else {
      if (
        opts.selectLimit != null &&
        current.length >= opts.selectLimit
      ) {
        throw new FavoritesToggleError(
          `Select limit reached (${opts.selectLimit})`,
        );
      }
      next = [...current, photoId];
      toggledOn = true;
    }
    const doc: GalleryVisitorFavorites = {
      id,
      studioId: opts.studioId,
      galleryId: opts.galleryId,
      visitorId: opts.visitorId,
      photoIds: next,
      updatedAt: new Date().toISOString(),
    };
    tx.set(ref, stripUndefined(doc));
    return { doc, toggledOn };
  });
}

export async function submitVisitorFavorites(opts: {
  studioId: string;
  galleryId: string;
  visitorId: string;
}): Promise<GalleryVisitorFavorites> {
  const existing = await getVisitorFavoritesDoc(
    opts.galleryId,
    opts.visitorId,
  );
  const photoIds = existing?.photoIds || [];
  if (!photoIds.length) {
    throw new Error("Select at least one photo before submitting");
  }
  if (existing?.submittedAt) {
    return existing;
  }
  return setVisitorFavorites({
    studioId: opts.studioId,
    galleryId: opts.galleryId,
    visitorId: opts.visitorId,
    photoIds,
    submittedAt: new Date().toISOString(),
  });
}

/** Submitted visitor selects for studio review (O(visitors for gallery)). */
export async function listGallerySelectSubmissions(
  galleryId: string,
): Promise<GallerySelectSubmission[]> {
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.galleryFavorites)
    .where("galleryId", "==", galleryId)
    .get();
  const rows: GallerySelectSubmission[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as GalleryVisitorFavorites;
    if (!data.submittedAt) continue;
    const photoIds = Array.isArray(data.photoIds)
      ? data.photoIds.map(String)
      : [];
    rows.push({
      id: doc.id,
      visitorId: data.visitorId,
      photoIds,
      submittedAt: data.submittedAt,
      updatedAt: data.updatedAt || data.submittedAt,
      count: photoIds.length,
    });
  }
  rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return rows;
}

/** Aggregate hearts + submissions for Wrap / Delivery (AURA-248). */
export async function galleryFavoritesSummary(galleryId: string): Promise<{
  visitorCount: number;
  heartCount: number;
  submissionCount: number;
  submittedPhotoCount: number;
}> {
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.galleryFavorites)
    .where("galleryId", "==", galleryId)
    .get();
  let visitorCount = 0;
  let heartCount = 0;
  let submissionCount = 0;
  let submittedPhotoCount = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as GalleryVisitorFavorites;
    const photoIds = Array.isArray(data.photoIds)
      ? data.photoIds.map(String)
      : [];
    if (!photoIds.length && !data.submittedAt) continue;
    visitorCount += 1;
    heartCount += photoIds.length;
    if (data.submittedAt) {
      submissionCount += 1;
      submittedPhotoCount += photoIds.length;
    }
  }
  return {
    visitorCount,
    heartCount,
    submissionCount,
    submittedPhotoCount,
  };
}

/** Cascade helper — delete visitor favorite docs for galleries being removed. */
export async function deleteFavoritesForGalleries(
  galleryIds: string[],
): Promise<void> {
  if (!galleryIds.length) return;
  const { db } = assertFirebaseReady();
  const ids = [...new Set(galleryIds)];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const snap = await db
      .collection(COL.galleryFavorites)
      .where("galleryId", "in", chunk)
      .get();
    if (snap.empty) continue;
    let batch = db.batch();
    let ops = 0;
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops++;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops) await batch.commit();
  }
}
