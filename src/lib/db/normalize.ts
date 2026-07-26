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

/** Ensure older data gains new fields / collections. */
export function normalizeDb(db: AuraDatabase): AuraDatabase {
  db.ideaCards ??= [];
  db.shotListTemplates ??= [];
  db.shootPlans ??= [];
  db.clients ??= [];
  db.shoots ??= [];
  db.packageTemplates ??= [];
  db.proposals ??= [];
  db.galleries ??= [];
  db.photos ??= [];
  db.comments ??= [];
  db.subAlbums ??= [];
  db.watermarkPresets ??= [];
  db.analyticsEvents ??= [];
  db.sessions ??= [];
  delete (db as { emailJobs?: unknown }).emailJobs;
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
    // Prefer a small corner mark over a huge centered stamp.
    if (!w.position || w.position === "center") {
      w.position = "bottom-right";
    }
    if (w.scale == null) w.scale = 0.14;
  }
  return db;
}
