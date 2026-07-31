import type {
  Gallery,
  Proposal,
  Shoot,
  ShootPlan,
  WizardStepId,
} from "@/lib/types";

export const WIZARD_STEPS: {
  id: WizardStepId;
  label: string;
  short: string;
}[] = [
  { id: "intake", label: "Intake", short: "1" },
  { id: "proposal", label: "Quote", short: "2" },
  { id: "prep", label: "Prep", short: "3" },
  { id: "shoot-day", label: "Session day", short: "4" },
  { id: "delivery", label: "Delivery", short: "5" },
  { id: "wrap", label: "Wrap", short: "6" },
];

/** Session tools only — quote/intake live on the project workflow. */
export const SESSION_TOOL_STEPS = WIZARD_STEPS.filter(
  (s) =>
    s.id === "prep" ||
    s.id === "shoot-day" ||
    s.id === "delivery" ||
    s.id === "wrap",
);

export function isWizardStepId(value: string): value is WizardStepId {
  return WIZARD_STEPS.some((s) => s.id === value);
}

export function deriveWizardProgress(input: {
  shoot: Shoot;
  proposal: Proposal | null;
  plan: ShootPlan | null;
  gallery: Gallery | null;
  photoCount: number;
}): {
  completed: WizardStepId[];
  currentStep: WizardStepId;
  unlocked: WizardStepId[];
} {
  const { shoot, proposal, plan, gallery, photoCount } = input;
  const completed: WizardStepId[] = [];

  const intakeDone = Boolean(
    shoot.intakeAnswers && Object.keys(shoot.intakeAnswers).length > 0,
  );
  if (intakeDone) completed.push("intake");

  const proposalDone =
    Boolean(shoot.wizardSkippedProposal) ||
    Boolean(proposal) ||
    proposal?.status === "accepted" ||
    shoot.status === "booked" ||
    shoot.status === "delivered" ||
    shoot.status === "archived";
  if (proposalDone) completed.push("proposal");

  const prepDone = Boolean(shoot.wizardSkippedPrep) || Boolean(plan);
  if (prepDone) completed.push("prep");

  const planComplete =
    Boolean(plan?.completedAt) ||
    (Boolean(plan) &&
      plan!.items.length > 0 &&
      plan!.items.every((i) => i.done));
  const shootDayDone =
    Boolean(shoot.wizardAdvancedPastShootDay) ||
    planComplete ||
    shoot.status === "delivered" ||
    shoot.status === "archived" ||
    Boolean(gallery && photoCount > 0);
  if (shootDayDone) completed.push("shoot-day");

  const deliveryDone =
    (Boolean(gallery) && photoCount > 0) ||
    gallery?.status === "live" ||
    gallery?.status === "archived" ||
    shoot.status === "archived";
  if (deliveryDone) completed.push("delivery");

  if (gallery?.status === "archived" || shoot.status === "archived" || shoot.status === "delivered") {
    completed.push("wrap");
  }

  const order = WIZARD_STEPS.map((s) => s.id);
  const currentStep =
    order.find((id) => !completed.includes(id)) || ("wrap" as WizardStepId);

  // Unlock current + all prior + completed; soft-unlock later steps when artifacts exist
  const unlockedSet = new Set<WizardStepId>(completed);
  unlockedSet.add(currentStep);
  const currentIdx = order.indexOf(currentStep);
  for (let i = 0; i <= currentIdx; i++) unlockedSet.add(order[i]!);
  unlockedSet.add("intake");
  // Quote lives on the project workflow — session tools stay reachable
  unlockedSet.add("prep");
  unlockedSet.add("shoot-day");
  if (proposal) unlockedSet.add("prep");
  if (plan || shoot.wizardSkippedPrep) unlockedSet.add("shoot-day");
  if (gallery) {
    unlockedSet.add("delivery");
    unlockedSet.add("wrap");
  }
  if (shootDayDone) unlockedSet.add("delivery");

  return {
    completed,
    currentStep,
    unlocked: order.filter((id) => unlockedSet.has(id)),
  };
}
