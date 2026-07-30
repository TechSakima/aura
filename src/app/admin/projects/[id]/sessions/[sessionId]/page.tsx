"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShootWizardShell } from "@/components/wizard/ShootWizardShell";
import { useShootWizard } from "@/components/wizard/useShootWizard";
import { DeliveryStep } from "@/components/wizard/steps/DeliveryStep";
import { PrepStep } from "@/components/wizard/steps/PrepStep";
import { ShootDayStep } from "@/components/wizard/steps/ShootDayStep";
import { WrapStep } from "@/components/wizard/steps/WrapStep";
import { EmptyState, useToast } from "@/components/ui";

import type { WizardStepId } from "@/lib/types";
import { SESSION_TOOL_STEPS } from "@/lib/wizard/steps";

const TOOL_IDS = new Set(SESSION_TOOL_STEPS.map((s) => s.id));

function WizardInner() {
  const { id: projectId, sessionId } = useParams<{
    id: string;
    sessionId: string;
  }>();
  const search = useSearchParams();
  const router = useRouter();
  const { push } = useToast();
  const requested = search.get("step");
  const safeRequested =
    requested && TOOL_IDS.has(requested as WizardStepId) ? requested : "prep";

  const { data, loading, error, step, setStep, reload } = useShootWizard(
    sessionId,
    safeRequested,
  );

  useEffect(() => {
    if (requested === "intake" || requested === "proposal") {
      router.replace(`/admin/projects/${projectId}`);
    }
  }, [requested, projectId, router]);

  useEffect(() => {
    if (!loading && data && !TOOL_IDS.has(step)) {
      selectStep("prep");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, step]);

  async function patchSession(body: Record<string, unknown>) {
    const res = await fetch(`/api/shoots/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      push("Could not update session", "danger");
      return false;
    }
    const data = await res.json().catch(() => ({}));
    if (data.calendarSyncFailed) {
      push("Saved · calendar not updated", "danger");
    }
    await reload();
    return true;
  }

  function goRelative(delta: number) {
    const idx = SESSION_TOOL_STEPS.findIndex((s) => s.id === step);
    const next = SESSION_TOOL_STEPS[idx + delta];
    if (!next || !data?.unlocked.includes(next.id)) return;
    selectStep(next.id);
  }

  function selectStep(id: WizardStepId) {
    if (!TOOL_IDS.has(id)) {
      router.replace(`/admin/projects/${projectId}`);
      return;
    }
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
    if (step === "prep" && !data.plan && !data.session?.wizardSkippedPrep) {
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
    const idx = SESSION_TOOL_STEPS.findIndex((s) => s.id === step);
    const next = SESSION_TOOL_STEPS[idx + 1];
    if (next) {
      await reload();
      selectStep(next.id);
    }
  }

  async function onSkip() {
    if (step === "prep") {
      await patchSession({ wizardSkippedPrep: true });
      selectStep("shoot-day");
    }
  }

  if (requested === "intake" || requested === "proposal") {
    return (
      <EmptyState variant="loading" title="Opening project workflow…" />
    );
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading session…" />;
  }
  if (error || !data) {
    return <EmptyState variant="error" title={error || "Not found"} />;
  }
  const session = data.session;
  if (!session) {
    return <EmptyState variant="error" title="Not found" />;
  }
  const project = data.project;
  const ownerId = project?.id || session.projectId || session.clientId;
  if (ownerId && ownerId !== projectId) {
    return (
      <EmptyState
        variant="error"
        title="This session belongs to another project."
      />
    );
  }

  const projectName = project?.name || "Project";
  const toolUnlocked = data.unlocked.filter((id) => TOOL_IDS.has(id));

  return (
    <ShootWizardShell
      projectId={projectId}
      projectName={projectName}
      sessionType={session.type}
      sessionDate={
        session.startsAt?.slice(0, 10) ||
        (session as { shootDate?: string }).shootDate
      }
      quoteToken={data.proposal?.token}
      galleryToken={data.gallery?.publicToken}
      step={TOOL_IDS.has(step) ? step : "prep"}
      completed={data.completed}
      unlocked={toolUnlocked.length ? toolUnlocked : ["prep"]}
      steps={SESSION_TOOL_STEPS}
      onStepChange={selectStep}
      onBack={() => goRelative(-1)}
      onNext={() => void onNext()}
      onSkip={step === "prep" ? () => void onSkip() : undefined}
      canSkip={step === "prep"}
      nextLabel={step === "wrap" ? "Done" : "Continue"}
    >
      {step === "prep" ? (
        <PrepStep
          shoot={session}
          plan={data.plan}
          templates={data.templates}
          onChanged={reload}
        />
      ) : null}
      {step === "shoot-day" ? (
        <ShootDayStep
          shoot={session}
          plan={data.plan}
          onChanged={reload}
        />
      ) : null}
      {step === "delivery" ? (
        <DeliveryStep
          shoot={session}
          clientName={projectName}
          projectEmail={project?.email}
          gallery={data.gallery}
          photos={data.photos}
          watermarkPresets={data.watermarkPresets}
          onChanged={reload}
        />
      ) : null}
      {step === "wrap" ? (
        <WrapStep
          shoot={session}
          gallery={data.gallery}
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
    <Suspense
      fallback={<EmptyState variant="loading" title="Loading session…" />}
    >
      <WizardInner />
    </Suspense>
  );
}
