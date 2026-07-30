import { z } from "zod";

/** Shared validation schemas (AURA-180). Use for FE+BE create/update. */

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  type: z.string().optional(),
  stage: z.string().optional(),
  projectDate: z.string().optional(),
  paidAmount: z.number().optional(),
});

export const projectPatchSchema = projectCreateSchema.partial().extend({
  stage: z.string().optional(),
  unarchive: z.boolean().optional(),
  workflowStep: z.string().optional(),
});

export const sessionCreateSchema = z.object({
  projectId: z.string().min(1),
  type: z.string().min(1),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  status: z.string().optional(),
});

export const sessionPatchSchema = z.object({
  type: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  proposalId: z.string().optional(),
  galleryId: z.string().optional(),
  googleEventId: z.string().optional(),
  intakeAnswers: z.record(z.string(), z.string()).optional(),
  status: z.string().optional(),
  wizardSkippedProposal: z.boolean().optional(),
  wizardSkippedPrep: z.boolean().optional(),
  wizardAdvancedPastShootDay: z.boolean().optional(),
});

export const galleryCreateSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(1),
  pin: z.string().length(4).regex(/^\d{4}$/),
  commentsEnabled: z.boolean().optional(),
  watermarkEnabled: z.boolean().optional(),
  watermarkPresetId: z.string().optional(),
  selectLimit: z.number().optional(),
  goLive: z.boolean().optional(),
});

export const quoteCreateSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().optional(),
  packageTemplateId: z.string().optional(),
  moodBoard: z.array(z.unknown()).optional(),
  tiers: z.array(z.unknown()).optional(),
  inclusions: z.array(z.unknown()).optional(),
  terms: z.string().optional(),
  intakeSchema: z.array(z.unknown()).optional(),
});
