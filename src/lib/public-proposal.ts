import type {
  IntakeQuestion,
  PackageTier,
  Proposal,
  ProposalStatus,
} from "@/lib/types";

/**
 * Public quote shape — allowlisted fields only (AURA-416).
 * Never expose studioId, project/session ids, packageTemplateId, timestamps, etc.
 */
export type PublicProposal = {
  status: ProposalStatus;
  title: string;
  moodBoard: { id: string; url: string; caption?: string }[];
  tiers: PackageTier[];
  inclusions: string[];
  terms: string;
  intakeSchema: IntakeQuestion[];
  selectedTierId?: string;
};

export function toPublicProposal(
  proposal: Proposal,
  moodBoard?: Proposal["moodBoard"],
): PublicProposal {
  return {
    status: proposal.status,
    title: proposal.title,
    moodBoard: moodBoard ?? proposal.moodBoard ?? [],
    tiers: proposal.tiers ?? [],
    inclusions: proposal.inclusions ?? [],
    terms: proposal.terms ?? "",
    intakeSchema: proposal.intakeSchema ?? [],
    selectedTierId: proposal.selectedTierId,
  };
}
