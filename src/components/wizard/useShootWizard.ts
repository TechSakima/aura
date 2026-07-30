"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Client,
  GalleryStatus,
  PackageTemplate,
  Proposal,
  Shoot,
  ShootPlan,
  WatermarkPreset,
  WizardStepId,
} from "@/lib/types";
import { isWizardStepId } from "@/lib/wizard/steps";

export type WizardGallery = {
  id: string;
  shootId?: string;
  sessionId?: string;
  projectId?: string;
  publicToken: string;
  title: string;
  commentsEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkPresetId?: string;
  selectLimit?: number;
  status: GalleryStatus;
  expiresAt: string;
  favoritePhotoIds: string[];
  coverPhotoUrl?: string;
  design?: import("@/lib/types").GalleryDesign;
  showOnHomepage?: boolean;
  hasDownloadPin?: boolean;
  clientEmailedAt?: string;
};

export type WizardPhoto = {
  id: string;
  kind: string;
  thumbUrl: string;
  watermarkedUrl: string;
  videoUrl?: string;
  version: number;
  sortOrder: number;
};

export type WizardBundle = {
  project: Client | null;
  session: Shoot;
  proposal: Proposal | null;
  plan: ShootPlan | null;
  gallery: WizardGallery | null;
  photoCount: number;
  photos: WizardPhoto[];
  packages: Pick<PackageTemplate, "id" | "name" | "defaultPricing">[];
  templates: { id: string; name: string; shootType: string; itemCount: number }[];
  watermarkPresets: WatermarkPreset[];
  completed: WizardStepId[];
  currentStep: WizardStepId;
  unlocked: WizardStepId[];
};

export function useShootWizard(shootId: string, requestedStep?: string | null) {
  const [data, setData] = useState<WizardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<WizardStepId>("intake");

  const reload = useCallback(async () => {
    const res = await fetch(`/api/sessions/${shootId}/wizard`);
    if (!res.ok) {
      setError("Could not load workflow");
      setData(null);
      setLoading(false);
      return null;
    }
    const json = (await res.json()) as WizardBundle;
    setData(json);
    setError("");
    setLoading(false);

    const preferred =
      requestedStep && isWizardStepId(requestedStep) && json.unlocked.includes(requestedStep)
        ? requestedStep
        : ["prep", "shoot-day", "delivery", "wrap"].includes(json.currentStep)
          ? json.currentStep
          : json.unlocked.includes("prep")
            ? "prep"
            : json.currentStep;
    setStep(preferred);
    return json;
  }, [shootId, requestedStep]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  function selectStep(next: WizardStepId) {
    if (!data?.unlocked.includes(next)) return;
    setStep(next);
  }

  return { data, loading, error, step, setStep: selectStep, reload };
}
