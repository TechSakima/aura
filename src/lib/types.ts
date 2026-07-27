export type ShootStatus =
  | "inquiry"
  | "proposed"
  | "booked"
  | "delivered"
  | "archived";

export type DepositStatus = "none" | "awaited" | "received" | "waived";

export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";

export type GalleryStatus = "draft" | "live" | "expired" | "archived";

export type WatermarkMode = "text" | "image";

export type WatermarkPosition =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type AnalyticsEventType =
  | "proposal_view"
  | "proposal_accept"
  | "gallery_view"
  | "photo_view"
  | "download_single"
  | "download_bulk"
  | "subalbum_view"
  | "favorite_toggle";

export type IntakeQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date";
  required?: boolean;
  options?: string[];
};

export type PackageTier = {
  id: string;
  name: string;
  price: number;
  description: string;
  highlighted?: boolean;
};

export type PrintPartner = {
  id: string;
  name: string;
  url: string;
  note: string;
};

export type Client = {
  id: string;
  studioId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type WizardStepId =
  | "intake"
  | "proposal"
  | "prep"
  | "shoot-day"
  | "delivery"
  | "wrap";

export type Shoot = {
  id: string;
  studioId: string;
  clientId: string;
  type: string;
  shootDate?: string;
  status: ShootStatus;
  proposalId?: string;
  galleryId?: string;
  intakeAnswers?: Record<string, string>;
  /** Wizard: user skipped package/proposal step */
  wizardSkippedProposal?: boolean;
  /** Wizard: user skipped prep (shot list / ideas) */
  wizardSkippedPrep?: boolean;
  /** Wizard: user moved past shoot-day without finishing checklist */
  wizardAdvancedPastShootDay?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PackageTemplate = {
  id: string;
  studioId: string;
  name: string;
  defaultPricing: PackageTier[];
  contractTerms: string;
  inclusions: string[];
  intakeQuestions: IntakeQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type Proposal = {
  id: string;
  studioId: string;
  token: string;
  shootId: string;
  packageTemplateId?: string;
  status: ProposalStatus;
  title: string;
  moodBoard: { id: string; url: string; caption?: string }[];
  tiers: PackageTier[];
  inclusions: string[];
  terms: string;
  intakeSchema: IntakeQuestion[];
  intakeAnswers: Record<string, string>;
  selectedTierId?: string;
  depositStatus: DepositStatus;
  createdAt: string;
  updatedAt: string;
};

export type WatermarkPreset = {
  id: string;
  studioId: string;
  name: string;
  mode: WatermarkMode;
  text?: string;
  imagePath?: string;
  position: WatermarkPosition;
  opacity: number;
  scale?: number;
};

export type Photo = {
  id: string;
  studioId: string;
  galleryId: string;
  kind: "main" | "peek";
  storagePath: string;
  thumbUrl: string;
  webUrl: string;
  watermarkedUrl: string;
  sortOrder: number;
  aspect: number;
  version: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  studioId: string;
  galleryId: string;
  photoId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type SubAlbum = {
  id: string;
  studioId: string;
  galleryId: string;
  token: string;
  label: string;
  photoIds: string[];
  createdAt: string;
};

export type Gallery = {
  id: string;
  studioId: string;
  shootId: string;
  publicToken: string;
  title: string;
  downloadPinHash: string;
  commentsEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkPresetId?: string;
  selectLimit?: number;
  expiresAt: string;
  liveAt?: string;
  status: GalleryStatus;
  coverPhotoUrl?: string;
  favoritePhotoIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsEvent = {
  id: string;
  studioId?: string;
  type: AnalyticsEventType;
  galleryId?: string;
  proposalId?: string;
  shootId?: string;
  photoId?: string;
  meta?: Record<string, string | number | boolean>;
  at: string;
};

/** @deprecated Prefer Studio — kept for gradual migration */
export type StudioSettings = {
  name: string;
  logoUrl?: string;
  adminEmail: string;
  adminPasswordHash: string;
  defaultWatermarkPresetId?: string;
  printPartners: PrintPartner[];
  brandTagline?: string;
};

export type Studio = {
  id: string;
  name: string;
  logoUrl?: string;
  brandTagline?: string;
  defaultWatermarkPresetId?: string;
  printPartners: PrintPartner[];
  /** Email of the owner at creation / migration (for claiming membership). */
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioMember = {
  uid: string;
  email: string;
  studioId: string;
  role: "owner";
  createdAt: string;
};

export type Session = {
  token: string;
  expiresAt: string;
  uid: string;
  email: string;
  studioId: string;
};

export type IdeaCard = {
  id: string;
  studioId: string;
  title: string;
  category: string;
  notes?: string;
  referenceImageUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ShotListTemplateItem = {
  id: string;
  /** Shot name, e.g. "Rings" */
  label: string;
  /** Framing category, e.g. "Close-up", "Wide", "Backdrop" */
  category: string;
  /** @deprecated Prefer category — kept for older templates */
  section?: string;
  mustHave: boolean;
  referenceImageUrl?: string;
  note?: string;
  /** @deprecated Ideas merged into shot items */
  ideaCardId?: string;
};

export type ShotListTemplate = {
  id: string;
  studioId: string;
  name: string;
  shootType: string;
  items: ShotListTemplateItem[];
  createdAt: string;
  updatedAt: string;
};

export type ShotItem = {
  id: string;
  label: string;
  category: string;
  /** @deprecated Prefer category */
  section?: string;
  mustHave: boolean;
  done: boolean;
  referenceImageUrl?: string;
  ideaCardId?: string;
  note?: string;
  flagged?: boolean;
};

export type ShootPlan = {
  id: string;
  studioId: string;
  shootId: string;
  title: string;
  templateId?: string;
  items: ShotItem[];
  dayNotes?: string;
  timeline?: { id: string; label: string; at?: string }[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** In-memory workspace for one studio (admin session). */
export type AuraDatabase = {
  studio: Studio;
  clients: Client[];
  shoots: Shoot[];
  packageTemplates: PackageTemplate[];
  proposals: Proposal[];
  galleries: Gallery[];
  photos: Photo[];
  comments: Comment[];
  subAlbums: SubAlbum[];
  watermarkPresets: WatermarkPreset[];
  analyticsEvents: AnalyticsEvent[];
  ideaCards: IdeaCard[];
  shotListTemplates: ShotListTemplate[];
  shootPlans: ShootPlan[];
};

export type AdminContext = {
  studio: Studio;
  studioId: string;
  uid: string;
  email: string;
};
