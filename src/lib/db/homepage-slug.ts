import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { ensureMigrated, getStudioDoc } from "@/lib/db/store";
import type { Studio } from "@/lib/types";

export function normalizeHomepageSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * O(1) slug → studio via homepageSlugs index (AURA-111 / AURA-227).
 * Misses fall back to a one-time studio scan and backfill the index.
 */
export async function findStudioByHomepageSlug(
  slug: string,
): Promise<Studio | null> {
  const normalized = normalizeHomepageSlug(slug);
  if (!normalized) return null;

  await ensureMigrated();
  const { db } = assertFirebaseReady();

  const indexRef = db.collection(COL.homepageSlugs).doc(normalized);
  const indexSnap = await indexRef.get();
  if (indexSnap.exists) {
    const studioId = String(indexSnap.data()?.studioId || "");
    if (studioId) {
      const studio = await getStudioDoc(studioId);
      if (
        studio &&
        normalizeHomepageSlug(studio.homepage?.slug || "") === normalized
      ) {
        return studio;
      }
      await indexRef.delete().catch(() => undefined);
    }
  }

  const snap = await db.collection(COL.studios).get();
  for (const doc of snap.docs) {
    const s = { id: doc.id, ...doc.data() } as Studio;
    if (normalizeHomepageSlug(s.homepage?.slug || "") === normalized) {
      await indexRef.set({
        studioId: s.id,
        updatedAt: new Date().toISOString(),
      });
      return s;
    }
  }
  return null;
}

/** True if slug is free or already owned by studioId. */
export async function isHomepageSlugAvailable(
  slug: string,
  studioId: string,
): Promise<boolean> {
  const normalized = normalizeHomepageSlug(slug);
  if (!normalized) return false;
  const owner = await findStudioByHomepageSlug(normalized);
  return !owner || owner.id === studioId;
}

export async function syncHomepageSlugIndex(opts: {
  studioId: string;
  previousSlug?: string | null;
  nextSlug?: string | null;
}): Promise<void> {
  const prev = opts.previousSlug
    ? normalizeHomepageSlug(opts.previousSlug)
    : "";
  const next = opts.nextSlug ? normalizeHomepageSlug(opts.nextSlug) : "";
  if (prev === next) return;

  await ensureMigrated();
  const { db } = assertFirebaseReady();

  if (prev) {
    const ref = db.collection(COL.homepageSlugs).doc(prev);
    const snap = await ref.get();
    if (snap.exists && snap.data()?.studioId === opts.studioId) {
      await ref.delete().catch(() => undefined);
    }
  }

  if (next) {
    await db.collection(COL.homepageSlugs).doc(next).set({
      studioId: opts.studioId,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function clearHomepageSlugIndex(slug?: string | null): Promise<void> {
  const normalized = slug ? normalizeHomepageSlug(slug) : "";
  if (!normalized) return;
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  await db
    .collection(COL.homepageSlugs)
    .doc(normalized)
    .delete()
    .catch(() => undefined);
}
