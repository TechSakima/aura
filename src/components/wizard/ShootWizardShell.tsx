"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShootPublicLinks } from "@/components/admin/ShootPublicLinks";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { WizardStepId } from "@/lib/types";
import { WIZARD_STEPS } from "@/lib/wizard/steps";

export function ShootWizardShell({
  clientId,
  clientName,
  shootType,
  shootDate,
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
  children,
}: {
  clientId: string;
  clientName: string;
  shootType: string;
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
  children: ReactNode;
}) {
  const idx = WIZARD_STEPS.findIndex((s) => s.id === step);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            <Link
              href={`/admin/clients/${clientId}`}
              className="text-muted no-underline hover:text-ink"
            >
              {clientName}
            </Link>
            <span className="mx-2 text-line">/</span>
            Workflow
          </p>
          <h1 className="font-display text-4xl tracking-tight text-ink md:text-5xl">
            {shootType}
          </h1>
          {shootDate ? (
            <p className="text-muted">{shootDate}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShootPublicLinks
            quoteToken={quoteToken}
            galleryToken={galleryToken}
            showCopy
          />
          <Link
            href={`/admin/clients/${clientId}`}
            className="inline-flex min-h-9 items-center text-sm text-muted no-underline hover:text-ink"
          >
            Back to client
          </Link>
        </div>
      </div>

      <nav aria-label="Workflow steps" className="overflow-x-auto">
        <ol className="flex min-w-max gap-1 border-b border-line">
          {WIZARD_STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isDone = completed.includes(s.id);
            const isUnlocked = unlocked.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => onStepChange(s.id)}
                  className={cn(
                    "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                    isActive && "border-ink text-ink",
                    !isActive && isDone && "border-transparent text-ink/80",
                    !isActive &&
                      !isDone &&
                      isUnlocked &&
                      "border-transparent text-muted hover:text-ink",
                    !isUnlocked &&
                      "cursor-not-allowed border-transparent text-muted/35",
                  )}
                >
                  <span className="text-xs text-muted">{i + 1}</span>
                  <span>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-h-[12rem]">{children}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <Button tone="ghost" disabled={idx <= 0} onClick={onBack}>
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {canSkip && onSkip ? (
            <Button tone="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          ) : null}
          {onNext ? <Button onClick={onNext}>{nextLabel}</Button> : null}
        </div>
      </div>
    </div>
  );
}
