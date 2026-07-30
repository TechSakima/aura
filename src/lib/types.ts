/** Session lifecycle status (formerly ShootStatus). */
export type SessionStatus =
  | "inquiry"
  | "proposed"
  | "booked"
  | "delivered"
  | "archived";

/** @deprecated Use SessionStatus */
export type ShootStatus = SessionStatus;

/** Project workflow stage (Pixieset-style). */
export type ProjectStage =
  | "inquiry"
  | "booked"
  | "in_progress"
  | "delivered"
  | "completed"
  | "canceled"
  | "archived";

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
  | "payment_received"
  | "payment_reversed";

export type DateFormat = "mm/dd/yyyy" | "dd/mm/yyyy" | "yyyy-mm-dd";

/** Curated display+body pairings (AURA-228). Legacy sans/serif/display kept. */
export type FontPresetId =
  | "sans"
  | "serif"
  | "display"
  | "editorial"
  | "modern"
  | "soft";

/** Cover treatments (AURA-244). */
export type GalleryCoverStyle =
  | "full"
  | "third"
  | "none"
  | "immersive"
  | "split-title";

/** Shared with MediaGrid engine (AURA-246). */
export type GalleryGridMode = "masonry" | "justified" | "columns" | "diary";

export type GalleryThemeId =
  | "echo"
  | "spring"
  | "lark"
  | "sage"
  | "dusk"
  | "obsidian"
  | "velvet"
  | "ember";

/** Hero layout in gallery design doc — consumed by GalleryHero (AURA-241). */
export type GalleryHeroLayout =
  | "split"
  | "centered"
  | "vertical"
  | "minimal"
  | "cinematic";

export type GalleryTitleTreatment =
  | "display-light"
  | "display-vertical"
  | "sans-wide"
  | "sans-tight";

export type GalleryChromeVariant =
  | "sticky-minimal"
  | "floating"
  | "bottom-bar"
  | "branded";

/**
 * Gallery motion feel (AURA-252).
 * `reduced` = calm (minimal motion); `full` = cinematic; `system` = OS preference.
 */
export type GalleryMotionPreference = "full" | "reduced" | "system";

/** Photo spacing density (AURA-252). */
export type GalleryDensityPreference = "compact" | "comfortable" | "airy";

export type GalleryCoverModule = {
  style: GalleryCoverStyle;
  photoId?: string;
  focalX?: number;
  focalY?: number;
  layout: GalleryHeroLayout;
  titleTreatment: GalleryTitleTreatment;
  showDate: boolean;
  showDaysLeft: boolean;
  showCta: boolean;
  scrim?: "soft" | "strong";
};

export type GalleryChromeModule = {
  variant: GalleryChromeVariant;
  showStudioName: boolean;
  showLogo: boolean;
};

export type GalleryGridModule = {
  mode: GalleryGridMode;
};

export type GallerySelectsModule = {
  showCount: boolean;
  submitEnabled: boolean;
};

export type GalleryDownloadModule = {
  emphasizePin: boolean;
};

/** First-visit guest tips (AURA-254). */
export type GalleryCoachModule = {
  enabled: boolean;
};

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

export type PaymentTransactionStatus =
  | "succeeded"
  | "partially_refunded"
  | "refunded"
  | "disputed"
  | "failed";

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
  /** Curated preset id when chosen from the theme picker */
  presetId?: string;
  background: string;
  accent: string;
  fontPreset: FontPresetId;
};

/** How social links render on public surfaces (AURA-222). */
export type BrandSocialTreatment = "text" | "icons" | "pills";

/** Logo variants in a studio brand kit. */
export type BrandLogoVariants = {
  /** Symbol / icon mark */
  markUrl?: string;
  /** Wordmark (name as type/image) */
  wordmarkUrl?: string;
  /** Combined mark + wordmark — preferred for nav */
  lockupUrl?: string;
  /** Light / inverted mark for dark covers */
  invertedUrl?: string;
};

/**
 * Persisted brand kit (AURA-222). Theme presets are starting kits;
 * this document is the product source of truth after apply/customize.
 * Legacy logoUrl / coverLogoUrl / theme / defaultCoverImageUrl stay mirrored.
 */
export type StudioBrandKit = {
  /** Preset this kit was started from */
  basePresetId?: string;
  logos: BrandLogoVariants;
  coverImageUrl?: string;
  /** Curated display+body pairing (AURA-228) */
  fonts: {
    pairingId: FontPresetId;
  };
  background: string;
  accent: string;
  accentSecondary: string;
  socialTreatment: BrandSocialTreatment;
};

/**
 * Homepage collections layouts (AURA-231 / AURA-246).
 * Shared engine: masonry | justified | columns | diary.
 * `grid` aliases columns; list + cinematic stay homepage-specific.
 */
export type HomepageCollectionsLayout =
  | "masonry"
  | "justified"
  | "columns"
  | "diary"
  | "grid"
  | "list"
  | "cinematic";
export type HomepageSortOrder =
  | "created_desc"
  | "created_asc"
  | "title_asc";

/** Ordered homepage building blocks (AURA-223). */
export type HomepageModuleType =
  | "hero"
  | "bio"
  | "collections"
  | "featuredGallery"
  | "contact"
  | "bookingCta"
  | "customLinks"
  | "footer";

type HomepageModuleBase = {
  id: string;
  enabled: boolean;
};

/** Homepage hero layouts (AURA-230). */
export type HomepageHeroVariant =
  | "fullBleed"
  | "split"
  | "type"
  | "lockup";

export type HeroHomepageModule = HomepageModuleBase & {
  type: "hero";
  props: {
    variant?: HomepageHeroVariant;
    showLogo?: boolean;
    showName?: boolean;
    /** Booking PublicCta when bookingHref is available */
    showCta?: boolean;
  };
};

export type BioHomepageModule = HomepageModuleBase & {
  type: "bio";
  props: Record<string, never>;
};

export type CollectionsHomepageModule = HomepageModuleBase & {
  type: "collections";
  props: {
    layout: HomepageCollectionsLayout;
    sortOrder: HomepageSortOrder;
  };
};

export type FeaturedGalleryHomepageModule = HomepageModuleBase & {
  type: "featuredGallery";
  props: {
    galleryId?: string;
  };
};

export type ContactHomepageModule = HomepageModuleBase & {
  type: "contact";
  props: {
    showEmail: boolean;
    showPhone: boolean;
    showAddress: boolean;
    showWebsite: boolean;
    showSocialLinks: boolean;
    showContactForm: boolean;
  };
};

export type BookingCtaHomepageModule = HomepageModuleBase & {
  type: "bookingCta";
  props: Record<string, never>;
};

export type CustomLinksHomepageModule = HomepageModuleBase & {
  type: "customLinks";
  props: {
    links: { id: string; label: string; url: string }[];
  };
};

export type FooterHomepageModule = HomepageModuleBase & {
  type: "footer";
  props: {
    showStudioName?: boolean;
    showSocialLinks?: boolean;
  };
};

export type StudioHomepageModule =
  | HeroHomepageModule
  | BioHomepageModule
  | CollectionsHomepageModule
  | FeaturedGalleryHomepageModule
  | ContactHomepageModule
  | BookingCtaHomepageModule
  | CustomLinksHomepageModule
  | FooterHomepageModule;

export type StudioHomepageSettings = {
  enabled: boolean;
  slug: string;
  passwordHash?: string;
  /** Client-only flag from GET /api/studio — never persist. */
  hasPassword?: boolean;
  biography?: string;
  /** @deprecated Prefer modules; mirrored from bio/contact/booking/collections. */
  showBiography: boolean;
  showSocialLinks: boolean;
  showWebsite: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  /** Show Book CTA linking to /book/{slug} */
  showBooking?: boolean;
  /** Show contact form on public website (Phase 19 delivery). */
  showContactForm?: boolean;
  /** Homepage portfolio layout — mirrored from collections module */
  layout?: HomepageCollectionsLayout;
  sortOrder: HomepageSortOrder;
  /**
   * Ordered modules (AURA-223). Source of truth for composition;
   * unknown types ignored on normalize. Toggle fields stay mirrored.
   */
  modules?: StudioHomepageModule[];
};

/** Color/font source for a gallery (AURA-251). Experience modules still use `themeId`. */
export type GalleryBrandSource = "studio" | "gallery";

/**
 * Gallery experience document (AURA-239).
 * Layout modules come from `themeId` packages; colors/fonts from `brandSource`
 * (studio brand kit or gallery preset). Flat coverStyle/gridMode/coverPhoto* stay mirrored.
 */
export type GalleryDesign = {
  themeId: GalleryThemeId;
  /** Default `gallery` — override with studio brand kit colors/fonts. */
  brandSource: GalleryBrandSource;
  cover: GalleryCoverModule;
  chrome: GalleryChromeModule;
  grid: GalleryGridModule;
  selects: GallerySelectsModule;
  download: GalleryDownloadModule;
  motion: GalleryMotionPreference;
  density: GalleryDensityPreference;
  coach: GalleryCoachModule;
  /** Mirrored from cover.style */
  coverStyle: GalleryCoverStyle;
  /** Mirrored from grid.mode */
  gridMode: GalleryGridMode;
  coverPhotoId?: string;
  coverFocalX?: number;
  coverFocalY?: number;
  /** @deprecated Freeform — cleared on curated theme save */
  background?: string;
  accent?: string;
  appIconUrl?: string;
};

/** Studio-wide defaults for new galleries (AURA-334). */
export type DownloadPinPolicy = "required" | "optional";

export type StudioDeliveryDefaults = {
  commentsEnabled: boolean;
  watermarkEnabled: boolean;
  /** Days from create/go-live until expiry. */
  expiryDays: number;
  /** Omit or undefined = no select limit. */
  selectLimit?: number;
  downloadPinPolicy: DownloadPinPolicy;
  coverStyle: GalleryCoverStyle;
  themeId: GalleryThemeId;
  gridMode: GalleryGridMode;
};

/** Studio-wide booking setup defaults (AURA-336). */
export type StudioBookingDefaults = {
  /** Applied to new session types when buffer not set. */
  defaultBufferMinutes: number;
};

/** Studio-wide payment / deposit defaults (AURA-339). */
export type StudioPaymentDefaults = {
  /** Fixed $ used when creating a project deposit if no session-type amount. */
  defaultDepositAmount?: number;
  /** Prefill title for new library payment links. */
  defaultLinkTitle: string;
};

/** Public contact form delivery prefs (AURA-341 / AURA-310). */
export type StudioContactPrefs = {
  /** Inbox for contact messages; empty → ownerEmail. */
  recipientEmail?: string;
  /** Show contact form in gallery chrome (W11). */
  showGalleryContactForm: boolean;
  /** Send a short acknowledgment to the client (W11). */
  autoReplyEnabled: boolean;
  autoReplyMessage?: string;
};

/** Append-only public contact submission (AURA-305) — not loaded into AuraDatabase. */
export type ContactMessage = {
  id: string;
  studioId: string;
  source: "homepage" | "gallery" | "booking" | "other";
  name: string;
  email: string;
  phone?: string;
  message: string;
  context?: string;
  slug?: string;
  galleryId?: string;
  galleryToken?: string;
  proposalToken?: string;
  paymentLinkId?: string;
  /** Cancel soft-failure resolve (AURA-382) */
  cancelToken?: string;
  /** Project-scoped inbound / assign (AURA-371+) */
  projectId?: string;
  sessionId?: string;
  /** Resend delivery — filled by AURA-306 / outbox (AURA-313) */
  emailStatus?: "pending" | "sent" | "skipped" | "failed" | "queued";
  emailLastError?: string;
  createdAt: string;
};

/**
 * Durable email retry queue (AURA-313 contact; generalize in AURA-149).
 * Not loaded into AuraDatabase / TENANT_COLLECTIONS.
 */
export type EmailOutboxJob = {
  id: string;
  studioId: string;
  kind: "contact_message";
  /** contactMessages doc id */
  refId: string;
  status: "pending" | "sent" | "dead";
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

/** Legal / contract send defaults (AURA-345). */
export type StudioLegalDefaults = {
  /**
   * Documents contract template for new sends (includes cancel policy).
   * Quote package `contractTerms` remain quote-only — not used for signing.
   */
  defaultContractTemplateId?: string;
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

/** Dated occurrence under a Project. */
export type ProjectSession = {
  id: string;
  studioId: string;
  projectId: string;
  type: string;
  /** ISO UTC start */
  startsAt?: string;
  /** ISO UTC end */
  endsAt?: string;
  status: SessionStatus;
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
  /** Original upload filename for client downloads. */
  originalFilename?: string;
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
  /** Set when studio emails the gallery link (AURA-255). */
  clientEmailedAt?: string;
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
  /** Structured brand kit (AURA-222). Prefer over flat logo/theme fields. */
  brandKit?: StudioBrandKit;
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
  /** Defaults applied when creating galleries. */
  deliveryDefaults?: StudioDeliveryDefaults;
  /** Booking setup defaults (buffer for new session types). */
  bookingDefaults?: StudioBookingDefaults;
  /** Payment / deposit defaults for new projects and link forms. */
  paymentDefaults?: StudioPaymentDefaults;
  /** Contact form delivery (recipient, gallery form, auto-reply). */
  contactPrefs?: StudioContactPrefs;
  /** Default contract template for new agreement sends. */
  legalDefaults?: StudioLegalDefaults;
  socialLinks?: { label: string; url: string }[];
  /** Stripe Connect account id when onboarded */
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  /** Last live Connect account check (AURA-343). */
  stripeConnectLastCheckedAt?: string;
  /** Last Connect health error when incomplete or retrieve failed. */
  stripeConnectLastError?: string;
  /** Google Calendar OAuth (refresh token stored server-side encrypted if needed) */
  googleCalendarRefreshToken?: string;
  googleCalendarConnected?: boolean;
  /** Last successful GCal freeBusy/write (AURA-343). */
  googleCalendarLastSyncAt?: string;
  /** Last GCal sync/write failure message for Settings health. */
  googleCalendarLastSyncError?: string;
  notificationPrefs?: {
    emailQuoteAccepted?: boolean;
    emailPaymentReceived?: boolean;
    emailBookingSubmitted?: boolean;
    /** In-app bell + dashboard when a public contact arrives (AURA-311). */
    emailContactMessage?: boolean;
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

/** Session prep plan (formerly ShootPlan). */
export type SessionPlan = {
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

/** @deprecated Use SessionPlan */
export type ShootPlan = SessionPlan;

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
  /** Linked project when created from workflow deposit/balance */
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
  /** Checkout Session id (without `cs_` prefix duplication — raw `cs_…` from Stripe). */
  stripeCheckoutSessionId?: string;
  /** Defaults to succeeded for legacy rows. */
  status?: PaymentTransactionStatus;
  /** Cumulative gross dollars reversed (refunds). */
  refundedGross?: number;
  /** Cumulative net dollars removed from project.paidAmount. */
  refundedNet?: number;
  /** Stripe event ids already applied (idempotency). */
  reversalEventIds?: string[];
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
  /** ISO timestamp when signed */
  signedAt?: string;
  /** Explicit calendar date acknowledged at signing (YYYY-MM-DD) */
  signedDate?: string;
  /** Client typed acknowledgment that they read the agreement */
  acknowledgedTerms?: boolean;
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

/** Matches Echo package in gallery-design-presets (AURA-240). */
export const DEFAULT_GALLERY_DESIGN: GalleryDesign = {
  themeId: "echo",
  brandSource: "gallery",
  cover: {
    style: "full",
    layout: "split",
    titleTreatment: "sans-wide",
    showDate: true,
    showDaysLeft: true,
    showCta: true,
    scrim: "soft",
  },
  chrome: {
    variant: "sticky-minimal",
    showStudioName: true,
    showLogo: false,
  },
  grid: { mode: "masonry" },
  selects: { showCount: true, submitEnabled: false },
  download: { emphasizePin: true },
  motion: "system",
  density: "comfortable",
  coach: { enabled: true },
  coverStyle: "full",
  gridMode: "masonry",
};

export const DEFAULT_STUDIO_THEME: StudioTheme = {
  presetId: "linen",
  background: "#F3F1ED",
  accent: "#1C1915",
  fontPreset: "sans",
};
