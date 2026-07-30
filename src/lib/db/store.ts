import type { Firestore } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import {
  createEmptyStudio,
  createStudioDatabase,
} from "@/lib/db/seed";
import {
  COL,
  LEGACY_DATABASE_DOC,
  STUDIO_SETTINGS_DOC,
  TENANT_COLLECTIONS,
} from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { normalizeDb } from "@/lib/db/normalize";
import type {
  AnalyticsEvent,
  AuraDatabase,
  AuthSession,
  BookingRequest,
  Client,
  Comment,
  ContactMessage,
  Contract,
  ContractTemplate,
  Gallery,
  IdeaCard,
  Invoice,
  PackageTemplate,
  PaymentLinkTemplate,
  PaymentTransaction,
  Photo,
  Project,
  ProjectSession,
  Proposal,
  QuestionnaireResponse,
  QuestionnaireTemplate,
  SessionType,
  Shoot,
  ShootPlan,
  ShotListTemplate,
  Studio,
  StudioMember,
  StudioNotification,
  StudioSettings,
  SubAlbum,
  WatermarkPreset,
} from "@/lib/types";

let writeQueue: Promise<void> = Promise.resolve();
let multiTenantMigrated = false;

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function listByStudioId<T extends { id: string }>(
  db: Firestore,
  name: string,
  studioId: string,
): Promise<T[]> {
  const snap = await db.collection(name).where("studioId", "==", studioId).get();
  return snap.docs.map((d) => {
    const data = d.data() as Omit<T, "id">;
    return { ...data, id: d.id } as T;
  });
}

async function listAll<T extends { id: string }>(
  db: Firestore,
  name: string,
): Promise<T[]> {
  const snap = await db.collection(name).get();
  return snap.docs.map((d) => {
    const data = d.data() as Omit<T, "id">;
    return { ...data, id: d.id } as T;
  });
}

/** Write docs for one studio without deleting other tenants' documents. */
async function writeStudioCollection<T extends { id: string; studioId: string }>(
  db: Firestore,
  name: string,
  studioId: string,
  items: T[],
) {
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;
  const commit = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const item of items) {
    const { id, ...rest } = { ...item, studioId };
    batch.set(db.collection(name).doc(id), stripUndefined(rest));
    ops++;
    if (ops >= batchSize) await commit();
  }
  await commit();
}

/** Explicit deletes — required now that collection writes are upsert-only (AURA-002). */
export async function deleteStudioDocs(
  collection: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  writeQueue = writeQueue.then(async () => {
    await ensureMigrated();
    const { db } = assertFirebaseReady();
    const batchSize = 400;
    let batch = db.batch();
    let ops = 0;
    const commit = async () => {
      if (!ops) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };
    for (const id of ids) {
      batch.delete(db.collection(collection).doc(id));
      ops++;
      if (ops >= batchSize) await commit();
    }
    await commit();
  });
  await writeQueue;
}

/** Append / overwrite a single tenant document without a full studio rewrite (AURA-003). */
export async function appendStudioDoc<T extends { id: string; studioId: string }>(
  collection: string,
  doc: T,
): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureMigrated();
    const { db } = assertFirebaseReady();
    const { id, ...rest } = { ...doc };
    await db.collection(collection).doc(id).set(stripUndefined(rest));
  });
  await writeQueue;
}

/** Recent public contact messages — O(messages), not full workspace RMW (AURA-311). */
export async function listRecentContactMessages(
  studioId: string,
  limit = 8,
): Promise<ContactMessage[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.contactMessages)
    .where("studioId", "==", studioId)
    .get();
  const rows = snap.docs.map((d) => {
    const data = d.data() as Omit<ContactMessage, "id">;
    return { ...data, id: d.id } as ContactMessage;
  });
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.slice(0, Math.max(1, Math.min(limit, 40)));
}

/** Partial update on a single tenant document (no full studio RMW). */
export async function patchStudioDoc(
  collection: string,
  id: string,
  partial: Record<string, unknown>,
): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureMigrated();
    const { db } = assertFirebaseReady();
    await db
      .collection(collection)
      .doc(id)
      .set(stripUndefined({ ...partial, updatedAt: new Date().toISOString() }), {
        merge: true,
      });
  });
  await writeQueue;
}

/**
 * Read-modify-write one document in place (no full studio RMW).
 * Prefer this over updateStudioDb for hot public paths.
 */
export async function updateStudioDoc<T extends { id: string }>(
  collection: string,
  id: string,
  mutator: (current: T) => T | null | void | Promise<T | null | void>,
): Promise<T | null> {
  let result: T | null = null;
  writeQueue = writeQueue.then(async () => {
    await ensureMigrated();
    const { db } = assertFirebaseReady();
    const snap = await db.collection(collection).doc(id).get();
    if (!snap.exists) {
      result = null;
      return;
    }
    const current = { id: snap.id, ...snap.data() } as T;
    const next = await mutator(current);
    if (next) {
      const { id: _, ...rest } = next;
      await db.collection(collection).doc(id).set(stripUndefined(rest));
    }
    result = next || current;
  });
  await writeQueue;
  return result;
}

async function persistStudioDatabase(db: Firestore, raw: AuraDatabase) {
  const data = normalizeDb(raw);
  const studioId = data.studio.id;
  await db
    .collection(COL.studios)
    .doc(studioId)
    .set(stripUndefined(data.studio));

  const projects = data.projects;
  const sessions = data.sessions;
  // Single source: projects/projectSessions only (AURA-168). Legacy clients/shoots
  // are not written; normalizeDb backfills on read only when canonical is empty.

  await writeStudioCollection(db, COL.projects, studioId, projects);
  await writeStudioCollection(db, COL.projectSessions, studioId, sessions);
  await writeStudioCollection(
    db,
    COL.packageTemplates,
    studioId,
    data.packageTemplates,
  );
  await writeStudioCollection(db, COL.proposals, studioId, data.proposals);
  await writeStudioCollection(db, COL.galleries, studioId, data.galleries);
  await writeStudioCollection(db, COL.photos, studioId, data.photos);
  await writeStudioCollection(db, COL.comments, studioId, data.comments);
  await writeStudioCollection(db, COL.subAlbums, studioId, data.subAlbums);
  await writeStudioCollection(
    db,
    COL.watermarkPresets,
    studioId,
    data.watermarkPresets,
  );
  await writeStudioCollection(
    db,
    COL.analyticsEvents,
    studioId,
    data.analyticsEvents.map((e) => ({
      ...e,
      studioId: e.studioId || studioId,
    })),
  );
  await writeStudioCollection(db, COL.ideaCards, studioId, data.ideaCards);
  await writeStudioCollection(
    db,
    COL.shotListTemplates,
    studioId,
    data.shotListTemplates,
  );
  await writeStudioCollection(db, COL.shootPlans, studioId, data.shootPlans);
  await writeStudioCollection(db, COL.notifications, studioId, data.notifications);
  await writeStudioCollection(db, COL.paymentLinks, studioId, data.paymentLinks);
  await writeStudioCollection(db, COL.invoices, studioId, data.invoices);
  await writeStudioCollection(
    db,
    COL.paymentTransactions,
    studioId,
    data.paymentTransactions,
  );
  await writeStudioCollection(
    db,
    COL.contractTemplates,
    studioId,
    data.contractTemplates,
  );
  await writeStudioCollection(db, COL.contracts, studioId, data.contracts);
  await writeStudioCollection(
    db,
    COL.questionnaireTemplates,
    studioId,
    data.questionnaireTemplates,
  );
  await writeStudioCollection(
    db,
    COL.questionnaireResponses,
    studioId,
    data.questionnaireResponses,
  );
  await writeStudioCollection(db, COL.sessionTypes, studioId, data.sessionTypes);
  await writeStudioCollection(
    db,
    COL.bookingRequests,
    studioId,
    data.bookingRequests,
  );
}

async function loadStudioDatabase(
  db: Firestore,
  studioId: string,
): Promise<AuraDatabase | null> {
  const studioSnap = await db.collection(COL.studios).doc(studioId).get();
  if (!studioSnap.exists) return null;
  const studio = { id: studioSnap.id, ...studioSnap.data() } as Studio;

  const [
    projects,
    projectSessions,
    packageTemplates,
    proposals,
    galleries,
    photos,
    comments,
    subAlbums,
    watermarkPresets,
    analyticsEvents,
    ideaCards,
    shotListTemplates,
    shootPlans,
    notifications,
    paymentLinks,
    invoices,
    paymentTransactions,
    contractTemplates,
    contracts,
    questionnaireTemplates,
    questionnaireResponses,
    sessionTypes,
    bookingRequests,
  ] = await Promise.all([
    listByStudioId<Project>(db, COL.projects, studioId),
    listByStudioId<ProjectSession>(db, COL.projectSessions, studioId),
    listByStudioId<PackageTemplate>(db, COL.packageTemplates, studioId),
    listByStudioId<Proposal>(db, COL.proposals, studioId),
    listByStudioId<Gallery>(db, COL.galleries, studioId),
    listByStudioId<Photo>(db, COL.photos, studioId),
    listByStudioId<Comment>(db, COL.comments, studioId),
    listByStudioId<SubAlbum>(db, COL.subAlbums, studioId),
    listByStudioId<WatermarkPreset>(db, COL.watermarkPresets, studioId),
    listByStudioId<AnalyticsEvent>(db, COL.analyticsEvents, studioId),
    listByStudioId<IdeaCard>(db, COL.ideaCards, studioId),
    listByStudioId<ShotListTemplate>(db, COL.shotListTemplates, studioId),
    listByStudioId<ShootPlan>(db, COL.shootPlans, studioId),
    listByStudioId<StudioNotification>(db, COL.notifications, studioId),
    listByStudioId<PaymentLinkTemplate>(db, COL.paymentLinks, studioId),
    listByStudioId<Invoice>(db, COL.invoices, studioId),
    listByStudioId<PaymentTransaction>(db, COL.paymentTransactions, studioId),
    listByStudioId<ContractTemplate>(db, COL.contractTemplates, studioId),
    listByStudioId<Contract>(db, COL.contracts, studioId),
    listByStudioId<QuestionnaireTemplate>(
      db,
      COL.questionnaireTemplates,
      studioId,
    ),
    listByStudioId<QuestionnaireResponse>(
      db,
      COL.questionnaireResponses,
      studioId,
    ),
    listByStudioId<SessionType>(db, COL.sessionTypes, studioId),
    listByStudioId<BookingRequest>(db, COL.bookingRequests, studioId),
  ]);

  // Legacy collections: only scan when canonical is empty (dual-write backfill).
  // Skip two collection scans per load when canonical exists (AURA-167).
  const needLegacyClients = projects.length === 0;
  const needLegacyShoots = projectSessions.length === 0;
  const [clients, shoots] = await Promise.all([
    needLegacyClients
      ? listByStudioId<Client>(db, COL.clients, studioId)
      : Promise.resolve([] as Client[]),
    needLegacyShoots
      ? listByStudioId<Shoot>(db, COL.shoots, studioId)
      : Promise.resolve([] as Shoot[]),
  ]);

  return normalizeDb({
    studio,
    projects,
    sessions: projectSessions,
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
    ideaCards,
    shotListTemplates,
    shootPlans,
    notifications,
    paymentLinks,
    invoices,
    paymentTransactions,
    contractTemplates,
    contracts,
    questionnaireTemplates,
    questionnaireResponses,
    sessionTypes,
    bookingRequests,
  });
}

/** One-time: legacy studio/settings (+ unscoped docs) → studios/{id}. */
async function migrateToMultiTenant(db: Firestore): Promise<void> {
  if (multiTenantMigrated) return;

  const studiosSnap = await db.collection(COL.studios).limit(1).get();
  if (!studiosSnap.empty) {
    multiTenantMigrated = true;
    return;
  }

  // Prefer legacy monolith, then studio/settings.
  const legacy = await db.collection(COL.legacy).doc(LEGACY_DATABASE_DOC).get();
  const settingsSnap = await db
    .collection(COL.studio)
    .doc(STUDIO_SETTINGS_DOC)
    .get();

  let studioId = nanoid();
  let ownerEmail = "";
  let studioName = "Studio";
  let brandTagline: string | undefined;
  let logoUrl: string | undefined;
  let printPartners: Studio["printPartners"] = [];
  let defaultWatermarkPresetId: string | undefined;

  if (legacy.exists) {
    const raw = legacy.data() as {
      studio?: StudioSettings;
      clients?: Client[];
      shoots?: Shoot[];
      packageTemplates?: PackageTemplate[];
      proposals?: Proposal[];
      galleries?: Gallery[];
      photos?: Photo[];
      comments?: Comment[];
      subAlbums?: SubAlbum[];
      watermarkPresets?: WatermarkPreset[];
      analyticsEvents?: AnalyticsEvent[];
      ideaCards?: IdeaCard[];
      shotListTemplates?: ShotListTemplate[];
      shootPlans?: ShootPlan[];
    };
    const s = raw.studio;
    ownerEmail = (s?.adminEmail || "").toLowerCase();
    studioName = s?.name || "Studio";
    brandTagline = s?.brandTagline;
    logoUrl = s?.logoUrl;
    printPartners = s?.printPartners || [];
    defaultWatermarkPresetId = s?.defaultWatermarkPresetId;

    const studio = createEmptyStudio({
      id: studioId,
      name: studioName,
      ownerEmail: ownerEmail || "owner@example.com",
    });
    studio.brandTagline = brandTagline;
    studio.logoUrl = logoUrl;
    studio.printPartners = printPartners;
    studio.defaultWatermarkPresetId = defaultWatermarkPresetId;

    const stamp = <T extends { id: string }>(items: T[] | undefined) =>
      (items || []).map((item) => ({ ...item, studioId }));

    const data = normalizeDb({
      studio,
      projects: [],
      sessions: [],
      clients: stamp(raw.clients),
      shoots: stamp(raw.shoots),
      packageTemplates: stamp(raw.packageTemplates),
      proposals: stamp(raw.proposals),
      galleries: stamp(raw.galleries),
      photos: stamp(raw.photos),
      comments: stamp(raw.comments),
      subAlbums: stamp(raw.subAlbums),
      watermarkPresets: stamp(raw.watermarkPresets),
      analyticsEvents: stamp(raw.analyticsEvents),
      ideaCards: stamp(raw.ideaCards),
      shotListTemplates: stamp(raw.shotListTemplates),
      shootPlans: stamp(raw.shootPlans),
      notifications: [],
      paymentLinks: [],
      invoices: [],
      paymentTransactions: [],
      contractTemplates: [],
      contracts: [],
      questionnaireTemplates: [],
      questionnaireResponses: [],
      sessionTypes: [],
      bookingRequests: [],
    });
    await persistStudioDatabase(db, data);
  } else if (settingsSnap.exists) {
    const s = settingsSnap.data() as StudioSettings;
    ownerEmail = (s.adminEmail || "").toLowerCase();
    studioName = s.name || "Studio";
    const studio = createEmptyStudio({
      id: studioId,
      name: studioName,
      ownerEmail: ownerEmail || "owner@example.com",
    });
    studio.brandTagline = s.brandTagline;
    studio.logoUrl = s.logoUrl;
    studio.printPartners = s.printPartners || [];
    studio.defaultWatermarkPresetId = s.defaultWatermarkPresetId;

    // Stamp all existing flat collections.
    for (const colName of TENANT_COLLECTIONS) {
      const snap = await db.collection(colName).get();
      const batchSize = 400;
      let batch = db.batch();
      let ops = 0;
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.studioId) continue;
        batch.set(doc.ref, { ...data, studioId }, { merge: true });
        ops++;
        if (ops >= batchSize) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      if (ops) await batch.commit();
    }
    await db.collection(COL.studios).doc(studioId).set(stripUndefined(studio));
  } else {
    // Fresh project — no seed studio until someone signs up.
    multiTenantMigrated = true;
    return;
  }

  // Archive legacy settings so we don't re-migrate.
  if (settingsSnap.exists) {
    await db
      .collection(COL.studio)
      .doc(STUDIO_SETTINGS_DOC)
      .set(
        {
          migratedToStudioId: studioId,
          migratedAt: new Date().toISOString(),
        },
        { merge: true },
      );
  }

  multiTenantMigrated = true;
}

export async function ensureMigrated() {
  const { db } = assertFirebaseReady();
  await migrateToMultiTenant(db);
}

export async function readStudioDb(studioId: string): Promise<AuraDatabase> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const data = await loadStudioDatabase(db, studioId);
  if (!data) {
    throw new Error(`Studio not found: ${studioId}`);
  }
  return data;
}

export async function updateStudioDb<T>(
  studioId: string,
  mutator: (db: AuraDatabase) => T | Promise<T>,
): Promise<T> {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    await ensureMigrated();
    const { db } = assertFirebaseReady();
    const current = await loadStudioDatabase(db, studioId);
    if (!current) throw new Error(`Studio not found: ${studioId}`);
    result = await mutator(current);
    current.studio.id = studioId;
    current.studio.updatedAt = new Date().toISOString();
    // Single source — do not mirror to deprecated aliases on write (AURA-168).
    await persistStudioDatabase(db, current);
  });
  await writeQueue;
  return result;
}

/**
 * Append photos without rewriting the entire studio workspace.
 * Full persist on every upload was heavy and brittle under App Hosting.
 */
export async function appendStudioPhotos(
  studioId: string,
  photos: Photo[],
  opts?: { galleryId?: string; coverPhotoUrl?: string },
): Promise<void> {
  if (!photos.length) return;
  writeQueue = writeQueue.then(async () => {
    await ensureMigrated();
    const { db } = assertFirebaseReady();
    const batchSize = 400;
    let batch = db.batch();
    let ops = 0;
    const commit = async () => {
      if (!ops) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };

    for (const photo of photos) {
      const { id, ...rest } = { ...photo, studioId };
      batch.set(db.collection(COL.photos).doc(id), stripUndefined(rest));
      ops++;
      if (ops >= batchSize) await commit();
    }

    if (opts?.galleryId && opts.coverPhotoUrl) {
      batch.set(
        db.collection(COL.galleries).doc(opts.galleryId),
        {
          coverPhotoUrl: opts.coverPhotoUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      ops++;
    }

    await commit();
  });
  await writeQueue;
}

/** Compatibility: session-less callers must not use these. Prefer updateStudioDb. */
export async function readDb(): Promise<AuraDatabase> {
  throw new Error("readDb() removed — use readStudioDb(studioId)");
}

export async function updateDb<T>(
  _mutator: (db: AuraDatabase) => T | Promise<T>,
): Promise<T> {
  throw new Error("updateDb() removed — use updateStudioDb(studioId, mutator)");
}

export async function getStudioDoc(studioId: string): Promise<Studio | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db.collection(COL.studios).doc(studioId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Studio;
}

/** Galleries for one studio — O(galleries), not full workspace RMW (AURA-227). */
export async function listGalleriesForStudio(
  studioId: string,
): Promise<Gallery[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  return listByStudioId<Gallery>(db, COL.galleries, studioId);
}

/** Session types for one studio — O(types), not full workspace RMW (AURA-232). */
export async function listSessionTypesForStudio(
  studioId: string,
): Promise<SessionType[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  return listByStudioId<SessionType>(db, COL.sessionTypes, studioId);
}

export async function createStudioWithDefaults(opts: {
  name: string;
  ownerEmail: string;
  ownerUid: string;
}): Promise<{ studio: Studio; member: StudioMember }> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const studio = createEmptyStudio({
    name: opts.name,
    ownerEmail: opts.ownerEmail,
  });
  const workspace = createStudioDatabase(studio);
  await persistStudioDatabase(db, workspace);

  const member: StudioMember = {
    uid: opts.ownerUid,
    email: opts.ownerEmail.toLowerCase(),
    studioId: studio.id,
    role: "owner",
    createdAt: new Date().toISOString(),
  };
  await db
    .collection(COL.studioMembers)
    .doc(opts.ownerUid)
    .set(stripUndefined(member));

  const { syncHomepageSlugIndex } = await import("@/lib/db/homepage-slug");
  await syncHomepageSlugIndex({
    studioId: studio.id,
    previousSlug: "",
    nextSlug: workspace.studio.homepage?.slug || "",
  });

  return { studio: workspace.studio, member };
}

export async function getMemberByUid(
  uid: string,
): Promise<StudioMember | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db.collection(COL.studioMembers).doc(uid).get();
  if (!snap.exists) return null;
  return { uid: snap.id, ...snap.data() } as StudioMember;
}

/** Claim membership for migrated studio owner (matched by email). */
export async function claimStudioMembership(opts: {
  uid: string;
  email: string;
}): Promise<StudioMember | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const email = opts.email.toLowerCase();

  const existing = await getMemberByUid(opts.uid);
  if (existing) return existing;

  const studios = await listAll<Studio>(db, COL.studios);
  const match = studios.find((s) => s.ownerEmail?.toLowerCase() === email);
  if (!match) return null;

  // Only one owner member per studio for v1 — skip if someone else claimed.
  const membersSnap = await db
    .collection(COL.studioMembers)
    .where("studioId", "==", match.id)
    .limit(1)
    .get();
  if (!membersSnap.empty) return null;

  const member: StudioMember = {
    uid: opts.uid,
    email,
    studioId: match.id,
    role: "owner",
    createdAt: new Date().toISOString(),
  };
  await db
    .collection(COL.studioMembers)
    .doc(opts.uid)
    .set(stripUndefined(member));
  return member;
}

export async function createSession(session: AuthSession): Promise<void> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const { token, ...rest } = session;
  await db.collection(COL.sessions).doc(token).set(stripUndefined(rest));
}

export async function getSession(token: string): Promise<AuthSession | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db.collection(COL.sessions).doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data() as Omit<AuthSession, "token">;
  return { token: snap.id, ...data };
}

export async function deleteSession(token: string): Promise<void> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  await db.collection(COL.sessions).doc(token).delete();
}

/** Auth cookie sessions for a Firebase uid (not product projectSessions). */
export async function listSessionsForUid(uid: string): Promise<AuthSession[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db.collection(COL.sessions).where("uid", "==", uid).get();
  return snap.docs.map((d) => ({
    token: d.id,
    ...(d.data() as Omit<AuthSession, "token">),
  }));
}

/** Delete auth sessions for uid, optionally keeping one token (current device). */
export async function deleteSessionsForUid(
  uid: string,
  exceptToken?: string,
): Promise<number> {
  const sessions = await listSessionsForUid(uid);
  let deleted = 0;
  for (const session of sessions) {
    if (exceptToken && session.token === exceptToken) continue;
    await deleteSession(session.token);
    deleted += 1;
  }
  return deleted;
}

export async function getStudio(): Promise<Studio> {
  throw new Error("getStudio() removed — use getStudioDoc(studioId)");
}

export async function findGalleryByPublicToken(
  token: string,
): Promise<Gallery | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.galleries)
    .where("publicToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return { id: d.id, ...d.data() } as Gallery;
}

export async function findStudioIdByProjectCancelToken(
  token: string,
): Promise<string | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.projects)
    .where("cancelToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0]!.data() as { studioId?: string };
  return data.studioId || null;
}

export async function findProposalByToken(
  token: string,
): Promise<Proposal | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.proposals)
    .where("token", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return { id: d.id, ...d.data() } as Proposal;
}

export async function findSubAlbumByToken(
  token: string,
): Promise<SubAlbum | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.subAlbums)
    .where("token", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return { id: d.id, ...d.data() } as SubAlbum;
}

/** Photos for one gallery — O(gallery photos), not full studio (AURA-256). */
export async function listPhotosByGalleryId(
  galleryId: string,
): Promise<Photo[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const photosSnap = await db
    .collection(COL.photos)
    .where("galleryId", "==", galleryId)
    .get();
  const photos = photosSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Photo,
  );
  photos.sort((a, b) => a.sortOrder - b.sortOrder);
  return photos;
}

export async function listCommentsByGalleryId(
  galleryId: string,
): Promise<Comment[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.comments)
    .where("galleryId", "==", galleryId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
}

export async function listSubAlbumsByGalleryId(
  galleryId: string,
): Promise<SubAlbum[]> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db
    .collection(COL.subAlbums)
    .where("galleryId", "==", galleryId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SubAlbum);
}

export async function getGalleryById(
  galleryId: string,
): Promise<Gallery | null> {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snap = await db.collection(COL.galleries).doc(galleryId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Gallery;
}

export async function getPhotosByIds(ids: string[]): Promise<Photo[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const snaps = await Promise.all(
    unique.map((id) => db.collection(COL.photos).doc(id).get()),
  );
  const out: Photo[] = [];
  for (const snap of snaps) {
    if (!snap.exists) continue;
    out.push({ id: snap.id, ...snap.data() } as Photo);
  }
  return out;
}

/** Session (projectSessions) with legacy shoots fallback — single doc. */
export async function getSessionById(
  sessionId: string,
): Promise<Shoot | null> {
  if (!sessionId) return null;
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const sessionSnap = await db
    .collection(COL.projectSessions)
    .doc(sessionId)
    .get();
  if (sessionSnap.exists) {
    const s = { id: sessionSnap.id, ...sessionSnap.data() } as ProjectSession;
    return { ...s, clientId: s.projectId, shootDate: s.startsAt };
  }
  const shootSnap = await db.collection(COL.shoots).doc(sessionId).get();
  if (!shootSnap.exists) return null;
  return { id: shootSnap.id, ...shootSnap.data() } as Shoot;
}

export async function getProjectById(
  projectId: string,
): Promise<Client | null> {
  if (!projectId) return null;
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  let snap = await db.collection(COL.projects).doc(projectId).get();
  if (!snap.exists) {
    snap = await db.collection(COL.clients).doc(projectId).get();
  }
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Client;
}

export async function getGalleryBundle(galleryId: string) {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  const gallerySnap = await db.collection(COL.galleries).doc(galleryId).get();
  if (!gallerySnap.exists) return null;
  const gallery = {
    id: gallerySnap.id,
    ...gallerySnap.data(),
  } as Gallery;
  const photos = await listPhotosByGalleryId(galleryId);
  const sessionId = gallery.sessionId || gallery.shootId || "";
  const shoot = sessionId ? await getSessionById(sessionId) : null;
  const projectId =
    gallery.projectId || shoot?.projectId || shoot?.clientId || "";
  const client = projectId ? await getProjectById(projectId) : null;
  const studioId = gallery.studioId;
  const watermarkPresets = studioId
    ? await listByStudioId<WatermarkPreset>(db, COL.watermarkPresets, studioId)
    : [];
  return { gallery, photos, shoot, client, watermarkPresets };
}

/** Canonical project bundle (AURA-159). Alias of getClientBundle until FE cutover drops parallel keys. */
export async function getProjectBundle(projectId: string) {
  return getClientBundle(projectId);
}

export async function getClientBundle(clientId: string) {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  let clientSnap = await db.collection(COL.projects).doc(clientId).get();
  if (!clientSnap.exists) {
    clientSnap = await db.collection(COL.clients).doc(clientId).get();
  }
  if (!clientSnap.exists) return null;
  const client = { id: clientSnap.id, ...clientSnap.data() } as Client;
  const sessionsSnap = await db
    .collection(COL.projectSessions)
    .where("projectId", "==", clientId)
    .get();
  const byId = new Map<string, Shoot>();
  for (const d of sessionsSnap.docs) {
    const s = { id: d.id, ...d.data() } as ProjectSession;
    byId.set(d.id, {
      ...s,
      clientId: s.projectId,
      shootDate: s.startsAt,
    } as Shoot);
  }
  const shootsSnap = await db
    .collection(COL.shoots)
    .where("clientId", "==", clientId)
    .get();
  for (const d of shootsSnap.docs) {
    if (byId.has(d.id)) continue;
    byId.set(d.id, { id: d.id, ...d.data() } as Shoot);
  }
  // Also catch legacy shoots keyed by projectId
  const shootsByProject = await db
    .collection(COL.shoots)
    .where("projectId", "==", clientId)
    .get();
  for (const d of shootsByProject.docs) {
    if (byId.has(d.id)) continue;
    byId.set(d.id, { id: d.id, ...d.data() } as Shoot);
  }
  const shoots = [...byId.values()];
  return { client, shoots, project: client, sessions: shoots };
}

/** Canonical session bundle (AURA-159). Alias of getShootBundle until FE cutover drops parallel keys. */
export async function getSessionBundle(sessionId: string) {
  return getShootBundle(sessionId);
}

export async function getShootBundle(shootId: string) {
  await ensureMigrated();
  const { db } = assertFirebaseReady();
  let sessionSnap = await db.collection(COL.projectSessions).doc(shootId).get();
  let shoot: Shoot | null = null;
  if (sessionSnap.exists) {
    const s = { id: sessionSnap.id, ...sessionSnap.data() } as ProjectSession;
    shoot = { ...s, clientId: s.projectId, shootDate: s.startsAt };
  } else {
    const shootSnap = await db.collection(COL.shoots).doc(shootId).get();
    if (!shootSnap.exists) return null;
    shoot = { id: shootSnap.id, ...shootSnap.data() } as Shoot;
  }
  const projectId = shoot.projectId || shoot.clientId || "";
  let clientSnap = await db.collection(COL.projects).doc(projectId).get();
  if (!clientSnap.exists) {
    clientSnap = await db.collection(COL.clients).doc(projectId).get();
  }
  const client = clientSnap.exists
    ? ({ id: clientSnap.id, ...clientSnap.data() } as Client)
    : null;
  let gallery = null as Gallery | null;
  if (shoot.galleryId) {
    const g = await db.collection(COL.galleries).doc(shoot.galleryId).get();
    if (g.exists) gallery = { id: g.id, ...g.data() } as Gallery;
  }
  return { shoot, client, gallery, session: shoot, project: client };
}

export function storageBackend(): "firestore" {
  return "firestore";
}

export function mediaBackend(): "storage" {
  return "storage";
}
