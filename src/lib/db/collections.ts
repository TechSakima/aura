/** Top-level Firestore collections for Aura (Admin SDK only). */
export const COL = {
  studio: "studio",
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

export type CollectionKey = Exclude<keyof typeof COL, "legacy" | "studio">;
