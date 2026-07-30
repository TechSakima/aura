"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShootPublicLinks } from "@/components/admin/ShootPublicLinks";
import { Button, Tabs } from "@/components/ui";
import type { WizardStepId } from "@/lib/types";
import { WIZARD_STEPS } from "@/lib/wizard/steps";

export function ShootWizardShell({
  projectId,
  projectName,
  sessionType,
  sessionDate,
  quoteToken,
  galleryToken,
  step,
  completed,
  unlocked,
  onStepChange,
  onBack,
  onNext,
  onSkip,
  canSkip,
  nextLabel = "Continue",
  steps = WIZARD_STEPS,
  children,
  /** @deprecated use projectId */
  clientId,
  /** @deprecated use projectName */
  clientName,
  /** @deprecated use sessionType */
  shootType,
  /** @deprecated use sessionDate */
  shootDate,
}: {
  projectId?: string;
  projectName?: string;
  sessionType?: string;
  sessionDate?: string;
  clientId?: string;
  clientName?: string;
  shootType?: string;
  shootDate?: string;
  quoteToken?: string | null;
  galleryToken?: string | null;
  step: WizardStepId;
  completed: WizardStepId[];
  unlocked: WizardStepId[];
  onStepChange: (id: WizardStepId) => void;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  canSkip?: boolean;
  nextLabel?: string;
  steps?: typeof WIZARD_STEPS;
  children: ReactNode;
}) {
  const pid = projectId || clientId || "";
  const pname = projectName || clientName || "Project";
  const stype = sessionType || shootType || "Session";
  const sdate = sessionDate || shootDate;
  const navSteps = steps;
  const idx = navSteps.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:pb-8">
        <div className="min-w-0 space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            <Link
              href={`/admin/projects/${pid}`}
              className="text-muted no-underline hover:text-ink"
            >
              {pname}
            </Link>
            <span className="mx-2 text-line">/</span>
            After deposit
          </p>
          <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl md:text-5xl">
            {stype}
          </h1>
          {sdate ? <p className="text-muted">{sdate}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShootPublicLinks
            quoteToken={quoteToken}
            galleryToken={galleryToken}
            showCopy
          />
          <Link
            href={`/admin/projects/${pid}`}
            className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
          >
            Back to workflow
          </Link>
        </div>
      </div>

      <Tabs
        variant="progress"
        aria-label="Session tools after deposit"
        value={step}
        onChange={(id) => onStepChange(id as WizardStepId)}
        tabs={navSteps.map((s) => ({
          id: s.id,
          label: s.label,
          disabled: !unlocked.includes(s.id),
          done: completed.includes(s.id),
        }))}
      />

      <div className="min-h-[12rem]">{children}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <Button tone="ghost" disabled={idx <= 0} onClick={onBack} className="min-h-11">
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {canSkip && onSkip ? (
            <Button tone="ghost" onClick={onSkip} className="min-h-11">
              Skip for now
            </Button>
          ) : null}
          {onNext ? (
            <Button onClick={onNext} className="min-h-11">
              {nextLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
