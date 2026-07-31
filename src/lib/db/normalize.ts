import { nanoid } from "nanoid";
import { normalizeShotCategory } from "@/lib/shots";
import type {
  AuraDatabase,
  Project,
  ProjectSession,
  ProjectStage,
  ProjectWorkflowStep,
  ShotItem,
  ShotListTemplateItem,
  Studio,
} from "@/lib/types";
import { ensureStudioBrandKit } from "@/lib/brand-kit";
import { normalizeBookingDefaults } from "@/lib/booking-defaults";
import { normalizeDeliveryDefaults } from "@/lib/delivery-defaults";
import { normalizeContactPrefs } from "@/lib/contact-prefs";
import { normalizeGalleryDesign } from "@/lib/gallery-design";
import { ensureHomepageModules } from "@/lib/homepage-modules";
import { normalizeLegalDefaults } from "@/lib/legal-defaults";
import { normalizePaymentDefaults } from "@/lib/payment-defaults";
import { DEFAULT_STUDIO_THEME } from "@/lib/types";
import { DEFAULT_WATERMARK_SCALE } from "@/lib/watermark-scale";

const PROJECT_WORKFLOW_STEPS = new Set<string>([
  "inquiry",
  "questionnaire",
  "pricing",
  "contract",
  "deposit",
  "prep",
  "delivery",
]);

function coerceWorkflowStep(raw: unknown): ProjectWorkflowStep | undefined {
  if (raw == null || raw === "") return undefined;
  const step = String(raw);
  return PROJECT_WORKFLOW_STEPS.has(step)
    ? (step as ProjectWorkflowStep)
    : undefined;
}

function normalizeTemplateItem(item: ShotListTemplateItem): ShotListTemplateItem {
  const category = normalizeShotCategory(item.category || item.section);
  return { ...item, category, section: category };
}

function normalizePlanItem(item: ShotItem): ShotItem {
  const category = normalizeShotCategory(item.category || item.section);
  return { ...item, category, section: category };
}

function stampStudioId<T extends { studioId?: string }>(
  items: T[] | undefined,
  studioId: string,
): T[] {
  return (items || []).map((item) => ({
    ...item,
    studioId: item.studioId || studioId,
  }));
}

function stageFromShootStatus(status?: string): ProjectStage {
  switch (status) {
    case "inquiry":
    case "proposed":
      return "inquiry";
    case "booked":
      return "booked";
    case "delivered":
      return "delivered";
    case "archived":
      return "completed";
    default:
      return "inquiry";
  }
}

function coerceProject(raw: Record<string, unknown>, studioId: string): Project {
  const now = new Date().toISOString();
  const workflowStep = coerceWorkflowStep(raw.workflowStep);
  const cancelToken = raw.cancelToken ? String(raw.cancelToken) : undefined;
  const adminSlug = raw.adminSlug
    ? String(raw.adminSlug).trim().toLowerCase() || undefined
    : undefined;
  return {
    id: String(raw.id || nanoid()),
    studioId: String(raw.studioId || studioId),
    name: String(raw.name || "Untitled project"),
    adminSlug,
    email: String(raw.email || ""),
    phone: raw.phone ? String(raw.phone) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    type: String(raw.type || "Session"),
    stage: (raw.stage as ProjectStage) || "inquiry",
    projectDate: raw.projectDate ? String(raw.projectDate) : undefined,
    paidAmount: typeof raw.paidAmount === "number" ? raw.paidAmount : 0,
    workflowStep,
    cancelToken,
    createdAt: String(raw.createdAt || now),
    updatedAt: String(raw.updatedAt || now),
  };
}

/** Exported for regression checks: coerce must keep workflowStep + cancelToken. */
export function projectRoundTripPreserved(
  raw: Record<string, unknown>,
  studioId = "studio_test",
): boolean {
  const out = coerceProject(raw, studioId);
  if (
    raw.workflowStep != null &&
    PROJECT_WORKFLOW_STEPS.has(String(raw.workflowStep)) &&
    out.workflowStep !== String(raw.workflowStep)
  ) {
    return false;
  }
  if (raw.cancelToken != null && out.cancelToken !== String(raw.cancelToken)) {
    return false;
  }
  if (
    raw.adminSlug != null &&
    out.adminSlug !== String(raw.adminSlug).trim().toLowerCase()
  ) {
    return false;
  }
  return true;
}

function coerceSession(
  raw: Record<string, unknown>,
  studioId: string,
): ProjectSession {
  const now = new Date().toISOString();
  const projectId = String(raw.projectId || raw.clientId || "");
  const startsAt = raw.startsAt
    ? String(raw.startsAt)
    : raw.shootDate
      ? String(raw.shootDate)
      : undefined;
  const intakeAnswers =
    raw.intakeAnswers &&
    typeof raw.intakeAnswers === "object" &&
    !Array.isArray(raw.intakeAnswers)
      ? (raw.intakeAnswers as Record<string, string>)
      : undefined;
  const adminSlug = raw.adminSlug
    ? String(raw.adminSlug).trim().toLowerCase() || undefined
    : undefined;
  return {
    id: String(raw.id || nanoid()),
    studioId: String(raw.studioId || studioId),
    projectId,
    type: String(raw.type || "Session"),
    adminSlug,
    startsAt,
    endsAt: raw.endsAt ? String(raw.endsAt) : undefined,
    status: (raw.status as ProjectSession["status"]) || "inquiry",
    proposalId: raw.proposalId ? String(raw.proposalId) : undefined,
    galleryId: raw.galleryId ? String(raw.galleryId) : undefined,
    intakeAnswers,
    wizardSkippedProposal:
      raw.wizardSkippedProposal != null
        ? Boolean(raw.wizardSkippedProposal)
        : undefined,
    wizardSkippedPrep:
      raw.wizardSkippedPrep != null ? Boolean(raw.wizardSkippedPrep) : undefined,
    wizardAdvancedPastShootDay:
      raw.wizardAdvancedPastShootDay != null
        ? Boolean(raw.wizardAdvancedPastShootDay)
        : undefined,
    googleEventId: raw.googleEventId ? String(raw.googleEventId) : undefined,
    createdAt: String(raw.createdAt || now),
    updatedAt: String(raw.updatedAt || now),
  };
}

/** Exported for regression checks: session fields must survive coerce. */
export function sessionRoundTripPreserved(
  raw: Record<string, unknown>,
  studioId = "studio_test",
): boolean {
  const out = coerceSession(raw, studioId);
  const checks: Array<[unknown, unknown]> = [
    [raw.endsAt, out.endsAt],
    [raw.proposalId, out.proposalId],
    [raw.galleryId, out.galleryId],
    [raw.googleEventId, out.googleEventId],
  ];
  for (const [src, dst] of checks) {
    if (src != null && String(src) !== String(dst)) return false;
  }
  if (raw.startsAt != null && out.startsAt !== String(raw.startsAt)) return false;
  if (
    raw.startsAt == null &&
    raw.shootDate != null &&
    out.startsAt !== String(raw.shootDate)
  ) {
    return false;
  }
  if (raw.wizardSkippedProposal != null && out.wizardSkippedProposal !== Boolean(raw.wizardSkippedProposal)) {
    return false;
  }
  if (raw.wizardSkippedPrep != null && out.wizardSkippedPrep !== Boolean(raw.wizardSkippedPrep)) {
    return false;
  }
  if (
    raw.wizardAdvancedPastShootDay != null &&
    out.wizardAdvancedPastShootDay !== Boolean(raw.wizardAdvancedPastShootDay)
  ) {
    return false;
  }
  if (raw.intakeAnswers != null) {
    if (JSON.stringify(out.intakeAnswers) !== JSON.stringify(raw.intakeAnswers)) {
      return false;
    }
  }
  if (
    raw.adminSlug != null &&
    out.adminSlug !== String(raw.adminSlug).trim().toLowerCase()
  ) {
    return false;
  }
  return true;
}

function normalizeStudio(studio: Studio): Studio {
  const slugBase = (studio.name || "studio")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "studio";
  const next: Studio = {
    ...studio,
    printPartners: studio.printPartners || [],
    ownerEmail: studio.ownerEmail || "",
    timeZone: studio.timeZone || "America/Denver",
    dateFormat: studio.dateFormat || "mm/dd/yyyy",
    theme: studio.theme || { ...DEFAULT_STUDIO_THEME },
    homepage: {
      enabled: false,
      slug: `${slugBase}-${studio.id.slice(0, 6)}`,
      showBiography: true,
      showSocialLinks: true,
      showWebsite: true,
      showEmail: true,
      showPhone: true,
      showAddress: false,
      showBooking: true,
      showContactForm: false,
      layout: "masonry",
      sortOrder: "created_desc",
      ...(studio.homepage || {}),
    },
    notificationPrefs: {
      emailQuoteAccepted: true,
      emailPaymentReceived: true,
      emailBookingSubmitted: true,
      emailContactMessage: true,
      emailClientQuote: true,
      emailClientGallery: true,
      emailClientPayment: true,
      emailClientBooking: true,
      ...studio.notificationPrefs,
    },
    deliveryDefaults: normalizeDeliveryDefaults(studio.deliveryDefaults),
    bookingDefaults: normalizeBookingDefaults(studio.bookingDefaults),
    paymentDefaults: normalizePaymentDefaults(studio.paymentDefaults),
    contactPrefs: normalizeContactPrefs(studio.contactPrefs),
    legalDefaults: normalizeLegalDefaults(studio.legalDefaults),
    socialLinks: studio.socialLinks || [],
  };
  ensureStudioBrandKit(next);
  if (next.homepage) ensureHomepageModules(next.homepage);
  return next;
}

/** Ensure older data gains new fields / collections. */
export function normalizeDb(db: AuraDatabase): AuraDatabase {
  const studioId = db.studio?.id || "unknown";
  db.studio = normalizeStudio(db.studio);

  const legacyClients = (db.clients || []) as unknown as Record<string, unknown>[];
  const legacyShoots = (db.shoots || []) as unknown as Record<string, unknown>[];
  const existingProjects = (db.projects || []) as unknown as Record<string, unknown>[];
  const existingSessions = (db.sessions || []) as unknown as Record<
    string,
    unknown
  >[];

  const projectMap = new Map<string, Project>();
  for (const p of existingProjects) {
    const project = coerceProject(p, studioId);
    projectMap.set(project.id, project);
  }
  for (const c of legacyClients) {
    const project = coerceProject(c, studioId);
    if (!projectMap.has(project.id)) projectMap.set(project.id, project);
  }

  const sessions: ProjectSession[] = [];
  const seenSession = new Set<string>();
  for (const s of [...existingSessions, ...legacyShoots]) {
    const session = coerceSession(s, studioId);
    if (seenSession.has(session.id)) continue;
    seenSession.add(session.id);
    sessions.push(session);
    const project = projectMap.get(session.projectId);
    if (project && project.stage === "inquiry") {
      project.stage = stageFromShootStatus(session.status);
      if (!project.type || project.type === "Session") {
        project.type = session.type || project.type;
      }
      if (!project.projectDate && session.startsAt) {
        project.projectDate = session.startsAt.slice(0, 10);
      }
    }
  }

  db.projects = stampStudioId([...projectMap.values()], studioId);
  db.sessions = stampStudioId(sessions, studioId);
  // Compat aliases for older code paths during transition
  db.clients = db.projects;
  db.shoots = db.sessions.map((s) => ({
    ...s,
    clientId: s.projectId,
    shootDate: s.startsAt,
  }));

  db.ideaCards = stampStudioId(db.ideaCards, studioId);
  db.shotListTemplates = stampStudioId(db.shotListTemplates, studioId);
  db.shootPlans = stampStudioId(db.shootPlans, studioId).map((p) => ({
    ...p,
    sessionId: p.sessionId || p.shootId || "",
    shootId: p.shootId || p.sessionId,
  }));
  db.packageTemplates = stampStudioId(db.packageTemplates, studioId);
  db.proposals = stampStudioId(db.proposals, studioId).map((p) => {
    const projectId =
      p.projectId ||
      db.sessions.find((s) => s.id === (p.sessionId || p.shootId))?.projectId ||
      "";
    return {
      ...p,
      projectId,
      sessionId: p.sessionId || p.shootId,
      shootId: p.shootId || p.sessionId,
    };
  });
  db.galleries = stampStudioId(db.galleries, studioId).map((g) => {
    const sessionId = g.sessionId || g.shootId;
    const projectId =
      g.projectId ||
      db.sessions.find((s) => s.id === sessionId)?.projectId ||
      "";
    return {
      ...g,
      projectId,
      sessionId,
      shootId: g.shootId || sessionId,
      design: normalizeGalleryDesign(g.design),
      showOnHomepage: Boolean(g.showOnHomepage),
    };
  });
  db.photos = stampStudioId(db.photos, studioId);
  db.comments = stampStudioId(db.comments, studioId);
  db.subAlbums = stampStudioId(db.subAlbums, studioId);
  db.watermarkPresets = stampStudioId(db.watermarkPresets, studioId);
  db.analyticsEvents = stampStudioId(db.analyticsEvents, studioId).map((e) => ({
    ...e,
    // Promote deprecated shootId → sessionId for attribution (AURA-116).
    sessionId: e.sessionId || e.shootId,
  }));
  db.notifications = stampStudioId(db.notifications || [], studioId);
  db.paymentLinks = stampStudioId(db.paymentLinks || [], studioId);
  db.invoices = stampStudioId(db.invoices || [], studioId);
  db.paymentTransactions = stampStudioId(db.paymentTransactions || [], studioId);
  db.contractTemplates = stampStudioId(db.contractTemplates || [], studioId);
  db.contracts = stampStudioId(db.contracts || [], studioId);
  db.questionnaireTemplates = stampStudioId(
    db.questionnaireTemplates || [],
    studioId,
  );
  db.questionnaireResponses = stampStudioId(
    db.questionnaireResponses || [],
    studioId,
  );
  db.sessionTypes = stampStudioId(db.sessionTypes || [], studioId).map(
    (t) => ({
      ...t,
      active: t.active !== false,
    }),
  );
  db.bookingRequests = stampStudioId(db.bookingRequests || [], studioId);

  delete (db as { emailJobs?: unknown }).emailJobs;

  for (const pkg of db.packageTemplates) {
    delete (pkg as { emailSchedule?: unknown }).emailSchedule;
    for (const q of pkg.intakeQuestions || []) {
      if (q.type === "text" && /\bdate\b/i.test(q.label)) q.type = "date";
    }
  }
  for (const proposal of db.proposals) {
    for (const q of proposal.intakeSchema || []) {
      if (q.type === "text" && /\bdate\b/i.test(q.label)) q.type = "date";
    }
  }
  for (const t of db.shotListTemplates) {
    t.items = (t.items || []).map(normalizeTemplateItem);
  }
  for (const p of db.shootPlans) {
    p.items = (p.items || []).map(normalizePlanItem);
  }
  for (const w of db.watermarkPresets) {
    if (!w.position || w.position === "center") w.position = "bottom-right";
    if (w.scale == null) w.scale = DEFAULT_WATERMARK_SCALE;
  }
  return db;
}
