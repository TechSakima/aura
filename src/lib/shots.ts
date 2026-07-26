/** Framing / composition categories for shot ideas (unified shot list). */
export const SHOT_CATEGORIES = [
  "Wide",
  "Close-up",
  "Backdrop showcase",
  "Couple",
  "Group",
  "Detail",
  "Documentary",
  "Ceremony",
  "Reception",
  "Creative",
] as const;

export type ShotCategory = (typeof SHOT_CATEGORIES)[number];

export function normalizeShotCategory(value?: string): string {
  const v = (value || "").trim();
  if (!v) return "Detail";
  const match = SHOT_CATEGORIES.find(
    (c) => c.toLowerCase() === v.toLowerCase(),
  );
  if (match) return match;
  // Legacy section names → category
  if (/wide|establishing|venue/i.test(v)) return "Wide";
  if (/close|detail|ring|flat/i.test(v)) return "Close-up";
  if (/backdrop|portrait|studio/i.test(v)) return "Backdrop showcase";
  if (/couple|first look|golden/i.test(v)) return "Couple";
  if (/group|family|party/i.test(v)) return "Group";
  if (/ceremony|vow/i.test(v)) return "Ceremony";
  if (/reception|dance|cake/i.test(v)) return "Reception";
  if (/getting ready|prep/i.test(v)) return "Documentary";
  return v;
}
