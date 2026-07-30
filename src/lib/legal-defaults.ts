import type {
  AuraDatabase,
  ContractTemplate,
  Studio,
  StudioLegalDefaults,
} from "@/lib/types";

export const DEFAULT_LEGAL_DEFAULTS: StudioLegalDefaults = {};

export function normalizeLegalDefaults(
  raw?: Partial<StudioLegalDefaults> | null,
): StudioLegalDefaults {
  const id = String(raw?.defaultContractTemplateId ?? "").trim();
  return id ? { defaultContractTemplateId: id } : {};
}

export function studioLegalDefaults(studio: Studio): StudioLegalDefaults {
  return normalizeLegalDefaults(studio.legalDefaults);
}

/** Recommended Documents template for new contract sends (AURA-345). */
export function resolveDefaultContractTemplate(
  db: Pick<AuraDatabase, "studio" | "contractTemplates">,
): ContractTemplate | undefined {
  const id = studioLegalDefaults(db.studio).defaultContractTemplateId;
  if (id) {
    const preferred = db.contractTemplates.find((t) => t.id === id);
    if (preferred) return preferred;
  }
  return db.contractTemplates[0];
}
