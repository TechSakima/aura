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
  subAlbums: "subAlbums",
  watermarkPresets: "watermarkPresets",
  analyticsEvents: "analyticsEvents",
  /** Auth cookie sessions */
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
  /** Legacy monolith — read once for migration */
  legacy: "aura",
} as const;

export const STUDIO_SETTINGS_DOC = "settings";
export const LEGACY_DATABASE_DOC = "database";

/** Collections that carry studioId and are tenant-scoped. */
export const TENANT_COLLECTIONS = [
  COL.projects,
  COL.projectSessions,
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
