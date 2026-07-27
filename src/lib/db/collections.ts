/** Top-level Firestore collections for Aura (Admin SDK only). */
export const COL = {
  /** @deprecated legacy single-studio doc — migrated into studios/ */
  studio: "studio",
  studios: "studios",
  studioMembers: "studioMembers",
  clients: "clients",
  shoots: "shoots",
  packageTemplates: "packageTemplates",
  proposals: "proposals",
  galleries: "galleries",
  photos: "photos",
  comments: "comments",
  subAlbums: "subAlbums",
  watermarkPresets: "watermarkPresets",
  analyticsEvents: "analyticsEvents",
  sessions: "sessions",
  ideaCards: "ideaCards",
  shotListTemplates: "shotListTemplates",
  shootPlans: "shootPlans",
  /** Legacy monolith — read once for migration */
  legacy: "aura",
} as const;

export const STUDIO_SETTINGS_DOC = "settings";
export const LEGACY_DATABASE_DOC = "database";

/** Collections that carry studioId and are tenant-scoped. */
export const TENANT_COLLECTIONS = [
  COL.clients,
  COL.shoots,
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
] as const;
