import type { Firestore } from "firebase-admin/firestore";
import { createSeedDatabase } from "@/lib/db/seed";
import {
  COL,
  LEGACY_DATABASE_DOC,
  STUDIO_SETTINGS_DOC,
} from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { normalizeDb } from "@/lib/db/normalize";
import type {
  AnalyticsEvent,
  AuraDatabase,
  Client,
  Comment,
  Gallery,
  IdeaCard,
  PackageTemplate,
  Photo,
  Proposal,
  Shoot,
  ShootPlan,
  ShotListTemplate,
  StudioSettings,
  SubAlbum,
  WatermarkPreset,
} from "@/lib/types";

let writeQueue: Promise<void> = Promise.resolve();
let migrated = false;

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function listCollection<T extends { id: string }>(
  db: Firestore,
  name: string,
): Promise<T[]> {
  const snap = await db.collection(name).get();
  return snap.docs.map((d) => {
    const data = d.data() as Omit<T, "id">;
    return { ...data, id: d.id } as T;
  });
}

async function writeCollection<T extends { id: string }>(
  db: Firestore,
  name: string,
  items: T[],
) {
  const existing = await db.collection(name).listDocuments();
  const keep = new Set(items.map((i) => i.id));
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;
  const commit = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const ref of existing) {
    if (!keep.has(ref.id)) {
      batch.delete(ref);
      ops++;
      if (ops >= batchSize) await commit();
    }
  }
  for (const item of items) {
    const { id, ...rest } = item;
    batch.set(db.collection(name).doc(id), stripUndefined(rest));
    ops++;
    if (ops >= batchSize) await commit();
  }
  await commit();
}

async function migrateIfNeeded(db: Firestore): Promise<boolean> {
  if (migrated) return false;
  const settings = await db.collection(COL.studio).doc(STUDIO_SETTINGS_DOC).get();
  if (settings.exists) {
    migrated = true;
    return false;
  }

  const legacy = await db.collection(COL.legacy).doc(LEGACY_DATABASE_DOC).get();
  if (legacy.exists) {
    const data = normalizeDb(legacy.data() as AuraDatabase);
    await persistDatabase(db, data);
    migrated = true;
    return true;
  }

  const seed = createSeedDatabase();
  await persistDatabase(db, seed);
  migrated = true;
  return true;
}

async function persistDatabase(db: Firestore, raw: AuraDatabase) {
  const data = normalizeDb(raw);
  await db
    .collection(COL.studio)
    .doc(STUDIO_SETTINGS_DOC)
    .set(stripUndefined(data.studio));

  await writeCollection(db, COL.clients, data.clients);
  await writeCollection(db, COL.shoots, data.shoots);
  await writeCollection(db, COL.packageTemplates, data.packageTemplates);
  await writeCollection(db, COL.proposals, data.proposals);
  await writeCollection(db, COL.galleries, data.galleries);
  await writeCollection(db, COL.photos, data.photos);
  await writeCollection(db, COL.comments, data.comments);
  await writeCollection(db, COL.subAlbums, data.subAlbums);
  await writeCollection(db, COL.watermarkPresets, data.watermarkPresets);
  await writeCollection(db, COL.analyticsEvents, data.analyticsEvents);
  await writeCollection(
    db,
    COL.sessions,
    data.sessions.map((s) => ({ id: s.token, ...s })),
  );
  await writeCollection(db, COL.ideaCards, data.ideaCards);
  await writeCollection(db, COL.shotListTemplates, data.shotListTemplates);
  await writeCollection(db, COL.shootPlans, data.shootPlans);
}

async function loadDatabase(db: Firestore): Promise<AuraDatabase> {
  await migrateIfNeeded(db);

  const studioSnap = await db
    .collection(COL.studio)
    .doc(STUDIO_SETTINGS_DOC)
    .get();
  if (!studioSnap.exists) {
    const seed = createSeedDatabase();
    await persistDatabase(db, seed);
    return seed;
  }

  const [
    clients,
    shoots,
    packageTemplates,
    proposals,
    galleries,
    photos,
    comments,
    subAlbums,
    watermarkPresets,
    analyticsEvents,
    sessionDocs,
    ideaCards,
    shotListTemplates,
    shootPlans,
  ] = await Promise.all([
    listCollection<Client>(db, COL.clients),
    listCollection<Shoot>(db, COL.shoots),
    listCollection<PackageTemplate>(db, COL.packageTemplates),
    listCollection<Proposal>(db, COL.proposals),
    listCollection<Gallery>(db, COL.galleries),
    listCollection<Photo>(db, COL.photos),
    listCollection<Comment>(db, COL.comments),
    listCollection<SubAlbum>(db, COL.subAlbums),
    listCollection<WatermarkPreset>(db, COL.watermarkPresets),
    listCollection<AnalyticsEvent>(db, COL.analyticsEvents),
    listCollection<{ id: string; token: string; expiresAt: string }>(
      db,
      COL.sessions,
    ),
    listCollection<IdeaCard>(db, COL.ideaCards),
    listCollection<ShotListTemplate>(db, COL.shotListTemplates),
    listCollection<ShootPlan>(db, COL.shootPlans),
  ]);

  return normalizeDb({
    studio: studioSnap.data() as StudioSettings,
    clients,
    shoots,
    packageTemplates,
    proposals,
    galleries,
    photos,
    comments,
    subAlbums,
    watermarkPresets,
    analyticsEvents,
    sessions: sessionDocs.map((s) => ({
      token: s.token || s.id,
      expiresAt: s.expiresAt,
    })),
    ideaCards,
    shotListTemplates,
    shootPlans,
  });
}

export async function readDb(): Promise<AuraDatabase> {
  const { db } = assertFirebaseReady();
  return loadDatabase(db);
}

export async function writeDb(data: AuraDatabase): Promise<void> {
  const { db } = assertFirebaseReady();
  await persistDatabase(db, data);
}

export async function updateDb<T>(
  mutator: (db: AuraDatabase) => T | Promise<T>,
): Promise<T> {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    const { db } = assertFirebaseReady();
    const current = await loadDatabase(db);
    result = await mutator(current);
    await persistDatabase(db, current);
  });
  await writeQueue;
  return result;
}

/** Scoped reads — prefer these over readDb() for hot paths. */
export async function getStudio(): Promise<StudioSettings> {
  const db = await readDb();
  return db.studio;
}

export async function getGalleryBundle(galleryId: string) {
  const { db } = assertFirebaseReady();
  await migrateIfNeeded(db);
  const gallerySnap = await db.collection(COL.galleries).doc(galleryId).get();
  if (!gallerySnap.exists) return null;
  const gallery = { id: gallerySnap.id, ...gallerySnap.data() } as AuraDatabase["galleries"][0];
  const photosSnap = await db
    .collection(COL.photos)
    .where("galleryId", "==", galleryId)
    .get();
  const photos = photosSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as AuraDatabase["photos"][0],
  );
  photos.sort((a, b) => a.sortOrder - b.sortOrder);
  const shootSnap = await db.collection(COL.shoots).doc(gallery.shootId).get();
  const shoot = shootSnap.exists
    ? ({ id: shootSnap.id, ...shootSnap.data() } as AuraDatabase["shoots"][0])
    : null;
  let client = null as AuraDatabase["clients"][0] | null;
  if (shoot) {
    const clientSnap = await db.collection(COL.clients).doc(shoot.clientId).get();
    if (clientSnap.exists) {
      client = { id: clientSnap.id, ...clientSnap.data() } as AuraDatabase["clients"][0];
    }
  }
  const watermarks = await listCollection(db, COL.watermarkPresets);
  return { gallery, photos, shoot, client, watermarkPresets: watermarks };
}

export async function getClientBundle(clientId: string) {
  const { db } = assertFirebaseReady();
  await migrateIfNeeded(db);
  const clientSnap = await db.collection(COL.clients).doc(clientId).get();
  if (!clientSnap.exists) return null;
  const client = { id: clientSnap.id, ...clientSnap.data() } as AuraDatabase["clients"][0];
  const shootsSnap = await db
    .collection(COL.shoots)
    .where("clientId", "==", clientId)
    .get();
  const shoots = shootsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as AuraDatabase["shoots"][0],
  );
  return { client, shoots };
}

export async function getShootBundle(shootId: string) {
  const { db } = assertFirebaseReady();
  await migrateIfNeeded(db);
  const shootSnap = await db.collection(COL.shoots).doc(shootId).get();
  if (!shootSnap.exists) return null;
  const shoot = { id: shootSnap.id, ...shootSnap.data() } as AuraDatabase["shoots"][0];
  const clientSnap = await db.collection(COL.clients).doc(shoot.clientId).get();
  const client = clientSnap.exists
    ? ({ id: clientSnap.id, ...clientSnap.data() } as AuraDatabase["clients"][0])
    : null;
  let gallery = null as AuraDatabase["galleries"][0] | null;
  if (shoot.galleryId) {
    const g = await db.collection(COL.galleries).doc(shoot.galleryId).get();
    if (g.exists) gallery = { id: g.id, ...g.data() } as AuraDatabase["galleries"][0];
  }
  return { shoot, client, gallery };
}

export function storageBackend(): "firestore" {
  return "firestore";
}

export function mediaBackend(): "storage" {
  return "storage";
}
