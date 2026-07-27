export type ShootStatus =
  | "inquiry"
  | "proposed"
  | "booked"
  | "delivered"
  | "archived";

/** Project workflow stage (Pixieset-style). */
export type ProjectStage =
  | "inquiry"
  | "booked"
  | "in_progress"
  | "delivered"
  | "completed"
  | "canceled";

/** Project pipeline after booking inquiry. */
export type ProjectWorkflowStep =
  | "inquiry"
  | "questionnaire"
  | "pricing"
  | "contract"
  | "deposit"
  | "prep"
  | "delivery";

export type SessionPricingMode = "upfront" | "after_intake";

export type CancelPolicy = {
  /** Allow cancel until deposit/payment received */
  untilPayment?: boolean;
  /** Allow cancel until N days before session (null = no date gate) */
  daysBeforeSession?: number | null;
};

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
  | "favorite_toggle"
  | "booking_submitted"
  | "contract_signed"
  | "payment_received";

export type DateFormat = "mm/dd/yyyy" | "dd/mm/yyyy" | "yyyy-mm-dd";

export type FontPresetId = "sans" | "serif" | "display";

export type GalleryCoverStyle = "full" | "third" | "none";

export type GalleryGridMode = "masonry" | "justified" | "columns";

export type GalleryThemeId = "echo" | "spring" | "lark" | "sage";

export type ContractStatus =
  | "draft"
  | "awaiting_signature"
  | "completed"
  | "canceled";

export type InvoiceStatus =
  | "draft"
  | "upcoming"
  | "past_due"
  | "paid"
  | "canceled";

export type PaymentLinkMode = "fixed" | "customer_chooses";

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

export type StudioTheme = {
  background: string;
  accent: string;
  fontPreset: FontPresetId;
};

export type StudioHomepageSettings = {
  enabled: boolean;
  slug: string;
  passwordHash?: string;
  /** Client-only flag from GET /api/studio — never persist. */
  hasPassword?: boolean;
  biography?: string;
  showBiography: boolean;
  showSocialLinks: boolean;
  showWebsite: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  /** Show Book CTA linking to /book/{slug} */
  showBooking?: boolean;
  /** Homepage portfolio layout */
  layout?: "masonry" | "grid" | "list";
  sortOrder: "created_desc" | "created_asc" | "title_asc";
};

export type GalleryDesign = {
  coverStyle: GalleryCoverStyle;
  coverPhotoId?: string;
  coverFocalX?: number;
  coverFocalY?: number;
  themeId: GalleryThemeId;
  gridMode: GalleryGridMode;
  background?: string;
  accent?: string;
  appIconUrl?: string;
};

/** Job / engagement — formerly Client. */
export type Project = {
  id: string;
  studioId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  type: string;
  stage: ProjectStage;
  projectDate?: string;
  /** Dollars paid toward project (net of Stripe fees). */
  paidAmount: number;
  /** Current pipeline step for Project-centric workflow. */
  workflowStep?: ProjectWorkflowStep;
  /** Public cancel token for inquirer self-serve cancel. */
  cancelToken?: string;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated Use Project */
export type Client = Project;

export type WizardStepId =
  | "intake"
  | "proposal"
  | "prep"
  | "shoot-day"
  | "delivery"
  | "wrap";

/** Dated occurrence under a Project — formerly Shoot. */
export type ProjectSession = {
  id: string;
  studioId: string;
  projectId: string;
  type: string;
  /** ISO UTC start */
  startsAt?: string;
  /** ISO UTC end */
  endsAt?: string;
  status: ShootStatus;
  proposalId?: string;
  galleryId?: string;
  intakeAnswers?: Record<string, string>;
  wizardSkippedProposal?: boolean;
  wizardSkippedPrep?: boolean;
  wizardAdvancedPastShootDay?: boolean;
  googleEventId?: string;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated Use ProjectSession — kept for gradual migration */
export type Shoot = ProjectSession & {
  /** @deprecated use projectId */
  clientId?: string;
  /** @deprecated use startsAt */
  shootDate?: string;
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
  /** Project this quote belongs to */
  projectId: string;
  /** @deprecated use projectId; session link optional */
  shootId?: string;
  sessionId?: string;
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
  kind: "main" | "peek" | "video";
  storagePath: string;
  thumbUrl: string;
  webUrl: string;
  watermarkedUrl: string;
  /** Poster / playback URL for video */
  videoUrl?: string;
  mimeType?: string;
  durationSec?: number;
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
  projectId: string;
  /** @deprecated use projectId */
  shootId?: string;
  sessionId?: string;
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
  design?: GalleryDesign;
  showOnHomepage?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsEvent = {
  id: string;
  studioId?: string;
  type: AnalyticsEventType;
  galleryId?: string;
  proposalId?: string;
  projectId?: string;
  sessionId?: string;
  /** @deprecated */
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
  coverLogoUrl?: string;
  defaultCoverImageUrl?: string;
  brandTagline?: string;
  defaultWatermarkPresetId?: string;
  printPartners: PrintPartner[];
  ownerEmail: string;
  /** Business profile */
  ownerFirstName?: string;
  ownerLastName?: string;
  website?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  timeZone: string;
  dateFormat: DateFormat;
  theme?: StudioTheme;
  homepage?: StudioHomepageSettings;
  socialLinks?: { label: string; url: string }[];
  /** Stripe Connect account id when onboarded */
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  /** Google Calendar OAuth (refresh token stored server-side encrypted if needed) */
  googleCalendarRefreshToken?: string;
  googleCalendarConnected?: boolean;
  notificationPrefs?: {
    emailQuoteAccepted?: boolean;
    emailPaymentReceived?: boolean;
    emailBookingSubmitted?: boolean;
    emailClientQuote?: boolean;
    emailClientGallery?: boolean;
    emailClientPayment?: boolean;
    emailClientBooking?: boolean;
  };
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

/** Cookie / Firestore auth session (not a ProjectSession). */
export type AuthSession = {
  token: string;
  expiresAt: string;
  uid: string;
  email: string;
  studioId: string;
};

/** @deprecated Use AuthSession */
export type Session = AuthSession;

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
  label: string;
  category: string;
  section?: string;
  mustHave: boolean;
  referenceImageUrl?: string;
  note?: string;
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
  sessionId: string;
  /** @deprecated use sessionId */
  shootId?: string;
  title: string;
  templateId?: string;
  items: ShotItem[];
  dayNotes?: string;
  timeline?: { id: string; label: string; at?: string }[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioNotification = {
  id: string;
  studioId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type PaymentLinkTemplate = {
  id: string;
  studioId: string;
  title: string;
  description?: string;
  mode: PaymentLinkMode;
  /** Dollars */
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  imageUrl?: string;
  active: boolean;
  archived?: boolean;
  stripePaymentLinkId?: string;
  publicUrl?: string;
  /** Optional default project when sending from Payments hub */
  projectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  studioId: string;
  projectId: string;
  title: string;
  /** Net dollars owed to studio */
  netAmount: number;
  processingFee: number;
  grossAmount: number;
  status: InvoiceStatus;
  dueAt?: string;
  paidAt?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentTransaction = {
  id: string;
  studioId: string;
  projectId?: string;
  invoiceId?: string;
  paymentLinkId?: string;
  netAmount: number;
  processingFee: number;
  grossAmount: number;
  stripePaymentIntentId?: string;
  createdAt: string;
};

export type ContractTemplate = {
  id: string;
  studioId: string;
  name: string;
  body: string;
  /** Inquirer cancel rules (copied onto contracts / projects). */
  cancelPolicy?: CancelPolicy;
  createdAt: string;
  updatedAt: string;
};

export type Contract = {
  id: string;
  studioId: string;
  projectId: string;
  templateId?: string;
  title: string;
  body: string;
  token: string;
  status: ContractStatus;
  signerName?: string;
  signedAt?: string;
  cancelPolicy?: CancelPolicy;
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireTemplate = {
  id: string;
  studioId: string;
  name: string;
  questions: IntakeQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireResponse = {
  id: string;
  studioId: string;
  projectId: string;
  templateId: string;
  token: string;
  title: string;
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionDurationUnit = "minutes" | "hours" | "days";

export type SessionType = {
  id: string;
  studioId: string;
  name: string;
  /** Always stored as minutes; UI may edit in hours/days via durationUnit. */
  durationMinutes: number;
  /** How the studio prefers to enter duration. Default minutes. */
  durationUnit?: SessionDurationUnit;
  bufferMinutes: number;
  basePrice: number;
  description?: string;
  questionnaireTemplateId?: string;
  /** Show price on booking form vs send quote after intake. Default after_intake. */
  pricingMode?: SessionPricingMode;
  /** Deposit amount in dollars (project Checkout). Defaults to basePrice when unset. */
  depositAmount?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingRequest = {
  id: string;
  studioId: string;
  sessionTypeId: string;
  name: string;
  email: string;
  phone?: string;
  startsAt: string;
  notes?: string;
  status: "pending" | "confirmed" | "declined" | "canceled";
  declineReason?: string;
  cancelReason?: string;
  projectId?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
};

/** In-memory workspace for one studio (admin session). */
export type AuraDatabase = {
  studio: Studio;
  projects: Project[];
  sessions: ProjectSession[];
  /** @deprecated aliases populated in normalize for older callers */
  clients?: Project[];
  shoots?: ProjectSession[];
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
  notifications: StudioNotification[];
  paymentLinks: PaymentLinkTemplate[];
  invoices: Invoice[];
  paymentTransactions: PaymentTransaction[];
  contractTemplates: ContractTemplate[];
  contracts: Contract[];
  questionnaireTemplates: QuestionnaireTemplate[];
  questionnaireResponses: QuestionnaireResponse[];
  sessionTypes: SessionType[];
  bookingRequests: BookingRequest[];
};

export type AdminContext = {
  studio: Studio;
  studioId: string;
  uid: string;
  email: string;
};

export const DEFAULT_GALLERY_DESIGN: GalleryDesign = {
  coverStyle: "full",
  themeId: "echo",
  gridMode: "masonry",
};

export const DEFAULT_STUDIO_THEME: StudioTheme = {
  background: "#F3F3F3",
  accent: "#1D1D1D",
  fontPreset: "sans",
};
