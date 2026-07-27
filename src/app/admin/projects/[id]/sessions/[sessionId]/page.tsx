"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShootWizardShell } from "@/components/wizard/ShootWizardShell";
import { useShootWizard } from "@/components/wizard/useShootWizard";
import { DeliveryStep } from "@/components/wizard/steps/DeliveryStep";
import { IntakeStep } from "@/components/wizard/steps/IntakeStep";
import { PrepStep } from "@/components/wizard/steps/PrepStep";
import { QuoteStep } from "@/components/wizard/steps/QuoteStep";
import { ShootDayStep } from "@/components/wizard/steps/ShootDayStep";
import { WrapStep } from "@/components/wizard/steps/WrapStep";
import { useToast } from "@/components/ui";
import type { WizardStepId } from "@/lib/types";
import { WIZARD_STEPS } from "@/lib/wizard/steps";

function WizardInner() {
  const { id: projectId, sessionId } = useParams<{
    id: string;
    sessionId: string;
  }>();
  const search = useSearchParams();
  const router = useRouter();
  const { push } = useToast();
  const { data, loading, error, step, setStep, reload } = useShootWizard(
    sessionId,
    search.get("step"),
  );

  async function patchSession(body: Record<string, unknown>) {
    const res = await fetch(`/api/shoots/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      push("Could not update workflow", "danger");
      return false;
    }
    await reload();
    return true;
  }

  function goRelative(delta: number) {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    const next = WIZARD_STEPS[idx + delta];
    if (!next || !data?.unlocked.includes(next.id)) return;
    setStep(next.id);
    router.replace(
      `/admin/projects/${projectId}/sessions/${sessionId}?step=${next.id}`,
      { scroll: false },
    );
  }

  function selectStep(id: WizardStepId) {
    setStep(id);
    router.replace(
      `/admin/projects/${projectId}/sessions/${sessionId}?step=${id}`,
      { scroll: false },
    );
  }

  async function onNext() {
    if (!data) return;
    if (step === "wrap") {
      router.push(`/admin/projects/${projectId}`);
      return;
    }
    if (step === "proposal" && !data.proposal && !data.shoot.wizardSkippedProposal) {
      push("Create a quote or skip for now", "danger");
      return;
    }
    if (step === "prep" && !data.plan && !data.shoot.wizardSkippedPrep) {
      push("Create a plan or skip prep", "danger");
      return;
    }
    if (step === "shoot-day" && !data.completed.includes("shoot-day")) {
      await patchSession({ wizardAdvancedPastShootDay: true });
    }
    if (step === "delivery" && !data.gallery) {
      push("Create a gallery before continuing", "danger");
      return;
    }
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    const next = WIZARD_STEPS[idx + 1];
    if (next) {
      await reload();
      selectStep(next.id);
    }
  }

  async function onSkip() {
    if (step === "proposal") {
      await patchSession({ wizardSkippedProposal: true });
      selectStep("prep");
      return;
    }
    if (step === "prep") {
      await patchSession({ wizardSkippedPrep: true });
      selectStep("shoot-day");
    }
  }

  if (loading) return <p className="text-muted">Loading workflow…</p>;
  if (error || !data) return <p className="text-danger">{error || "Not found"}</p>;
  const ownerId = data.client?.id || data.shoot.projectId || data.shoot.clientId;
  if (ownerId && ownerId !== projectId) {
    return <p className="text-danger">This session belongs to another project.</p>;
  }

  const canSkip = step === "proposal" || step === "prep";
  const projectName = data.client?.name || "Project";

  return (
    <ShootWizardShell
      projectId={projectId}
      projectName={projectName}
      sessionType={data.shoot.type}
      sessionDate={
        data.shoot.startsAt?.slice(0, 10) ||
        (data.shoot as { shootDate?: string }).shootDate
      }
      quoteToken={data.proposal?.token}
      galleryToken={data.gallery?.publicToken}
      step={step}
      completed={data.completed}
      unlocked={data.unlocked}
      onStepChange={selectStep}
      onBack={() => goRelative(-1)}
      onNext={() => void onNext()}
      onSkip={canSkip ? () => void onSkip() : undefined}
      canSkip={canSkip}
      nextLabel={step === "wrap" ? "Back to project" : "Continue"}
    >
      {step === "intake" ? (
        <IntakeStep
          client={data.client}
          shoot={data.shoot}
          onSaved={async () => {
            await reload();
          }}
        />
      ) : null}
      {step === "proposal" ? (
        <QuoteStep
          shoot={data.shoot}
          proposal={data.proposal}
          packages={data.packages}
          onChanged={reload}
        />
      ) : null}
      {step === "prep" ? (
        <PrepStep
          shoot={data.shoot}
          plan={data.plan}
          templates={data.templates}
          onChanged={reload}
        />
      ) : null}
      {step === "shoot-day" ? (
        <ShootDayStep
          shoot={data.shoot}
          plan={data.plan}
          onChanged={reload}
        />
      ) : null}
      {step === "delivery" ? (
        <DeliveryStep
          shoot={data.shoot}
          clientName={projectName}
          gallery={data.gallery}
          photos={data.photos}
          watermarkPresets={data.watermarkPresets}
          onChanged={reload}
        />
      ) : null}
      {step === "wrap" ? (
        <WrapStep
          shoot={data.shoot}
          gallery={data.gallery}
          quoteToken={data.proposal?.token}
          photoCount={data.photoCount}
          favoriteCount={data.gallery?.favoritePhotoIds?.length || 0}
          onChanged={reload}
        />
      ) : null}
    </ShootWizardShell>
  );
}

export default function ProjectSessionWizardPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading workflow…</p>}>
      <WizardInner />
    </Suspense>
  );
}
