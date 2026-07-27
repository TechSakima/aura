import { normalizeShotCategory } from "@/lib/shots";
import type { AuraDatabase, ShotItem, ShotListTemplateItem } from "@/lib/types";

function normalizeTemplateItem(item: ShotListTemplateItem): ShotListTemplateItem {
  const category = normalizeShotCategory(item.category || item.section);
  return {
    ...item,
    category,
    section: category,
  };
}

function normalizePlanItem(item: ShotItem): ShotItem {
  const category = normalizeShotCategory(item.category || item.section);
  return {
    ...item,
    category,
    section: category,
  };
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

/** Ensure older data gains new fields / collections. */
export function normalizeDb(db: AuraDatabase): AuraDatabase {
  const studioId = db.studio?.id || "unknown";
  db.ideaCards = stampStudioId(db.ideaCards, studioId);
  db.shotListTemplates = stampStudioId(db.shotListTemplates, studioId);
  db.shootPlans = stampStudioId(db.shootPlans, studioId);
  db.clients = stampStudioId(db.clients, studioId);
  db.shoots = stampStudioId(db.shoots, studioId);
  db.packageTemplates = stampStudioId(db.packageTemplates, studioId);
  db.proposals = stampStudioId(db.proposals, studioId);
  db.galleries = stampStudioId(db.galleries, studioId);
  db.photos = stampStudioId(db.photos, studioId);
  db.comments = stampStudioId(db.comments, studioId);
  db.subAlbums = stampStudioId(db.subAlbums, studioId);
  db.watermarkPresets = stampStudioId(db.watermarkPresets, studioId);
  db.analyticsEvents = stampStudioId(db.analyticsEvents, studioId);
  delete (db as { emailJobs?: unknown; sessions?: unknown }).emailJobs;
  delete (db as { sessions?: unknown }).sessions;
  for (const pkg of db.packageTemplates) {
    delete (pkg as { emailSchedule?: unknown }).emailSchedule;
    for (const q of pkg.intakeQuestions || []) {
      if (q.type === "text" && /\bdate\b/i.test(q.label)) {
        q.type = "date";
      }
    }
  }
  for (const proposal of db.proposals) {
    for (const q of proposal.intakeSchema || []) {
      if (q.type === "text" && /\bdate\b/i.test(q.label)) {
        q.type = "date";
      }
    }
  }
  for (const t of db.shotListTemplates) {
    t.items = (t.items || []).map(normalizeTemplateItem);
  }
  for (const p of db.shootPlans) {
    p.items = (p.items || []).map(normalizePlanItem);
  }
  for (const w of db.watermarkPresets) {
    if (!w.position || w.position === "center") {
      w.position = "bottom-right";
    }
    if (w.scale == null) w.scale = 0.14;
  }
  if (db.studio) {
    db.studio.printPartners ??= [];
    db.studio.ownerEmail ??= "";
  }
  return db;
}
