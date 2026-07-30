/**
 * When false, never read deprecated `clients` / `shoots` collections (AURA-273).
 * Default true: empty-canonical studios still backfill once from legacy docs.
 * Set `AURA_LEGACY_COLLECTIONS=0` after all tenants are on projects/projectSessions.
 */
export function legacyCollectionsEnabled(): boolean {
  const v = process.env.AURA_LEGACY_COLLECTIONS?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

/** Top-level Firestore collections for Aura (Admin SDK only). */
export const COL = {
  /** @deprecated legacy single-studio doc — migrated into studios/ */
  studio: "studio",
  studios: "studios",
  studioMembers: "studioMembers",
  /** @deprecated use projects */
  clients: "clients",
  projects: "projects",
  /** @deprecated use projectSessions */
  shoots: "shoots",
  projectSessions: "projectSessions",
  packageTemplates: "packageTemplates",
  proposals: "proposals",
  galleries: "galleries",
  photos: "photos",
  comments: "comments",
  /** Per-visitor gallery hearts — not part of AuraDatabase / TENANT_COLLECTIONS */
  galleryFavorites: "galleryFavorites",
  subAlbums: "subAlbums",
  watermarkPresets: "watermarkPresets",
  analyticsEvents: "analyticsEvents",
  /**
   * Auth cookie sessions (login tokens) — NOT product sessions.
   * Product sessions are `projectSessions` (jobs under a Project). Rename candidate: `authSessions`.
   * Expired docs purged by `deleteExpiredAuthSessions` (AURA-110); logout deletes current row + cookie
   * (Firebase client Auth cleared separately via `clientLogout`).
   */
  sessions: "sessions",
  ideaCards: "ideaCards",
  shotListTemplates: "shotListTemplates",
  shootPlans: "shootPlans",
  notifications: "notifications",
  paymentLinks: "paymentLinks",
  invoices: "invoices",
  paymentTransactions: "paymentTransactions",
  contractTemplates: "contractTemplates",
  contracts: "contracts",
  questionnaireTemplates: "questionnaireTemplates",
  questionnaireResponses: "questionnaireResponses",
  sessionTypes: "sessionTypes",
  bookingRequests: "bookingRequests",
  /**
   * Public homepage/book slug → studioId (AURA-111 / AURA-227).
   * Doc id = normalized slug; fields: { studioId, updatedAt }.
   */
  homepageSlugs: "homepageSlugs",
  /**
   * Public contact form messages (AURA-305) — append-only; not in TENANT_COLLECTIONS.
   */
  contactMessages: "contactMessages",
  /**
   * Durable email retry queue (AURA-313 / AURA-149) — not in TENANT_COLLECTIONS.
   */
  emailOutbox: "emailOutbox",
  /**
   * Hard-delete tombstones (AURA-099) — block upsert-only RMW from resurrecting
   * deleted tenant docs. Doc id = `${collection}__${docId}`.
   */
  deletedDocs: "deletedDocs",
  /**
   * Shared rate-limit buckets (AURA-107) — not tenant-scoped.
   * Doc id = sha256(key).slice(0, 40); fields: count, resetAt, updatedAt.
   */
  rateLimits: "rateLimits",
  /** Legacy monolith — read once for migration */
  legacy: "aura",
} as const;

/** Tombstone doc id — unique per collection + entity id (AURA-099). */
export function deletedDocKey(collection: string, id: string): string {
  return `${collection}__${id}`;
}

export const STUDIO_SETTINGS_DOC = "settings";
export const LEGACY_DATABASE_DOC = "database";

/** Collections that carry studioId and are tenant-scoped. */
export const TENANT_COLLECTIONS = [
  COL.projects,
  COL.projectSessions,
  COL.packageTemplates,
  COL.proposals,
  COL.galleries,
  COL.photos,
  COL.comments,
  COL.subAlbums,
  COL.watermarkPresets,
  COL.analyticsEvents,
  COL.ideaCards,
  COL.shotListTemplates,
  COL.shootPlans,
  COL.notifications,
  COL.paymentLinks,
  COL.invoices,
  COL.paymentTransactions,
  COL.contractTemplates,
  COL.contracts,
  COL.questionnaireTemplates,
  COL.questionnaireResponses,
  COL.sessionTypes,
  COL.bookingRequests,
] as const;
