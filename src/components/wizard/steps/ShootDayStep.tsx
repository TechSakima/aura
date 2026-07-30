"use client";

import { SessionShootDay } from "@/components/admin/SessionShootDay";
import type { Shoot, ShootPlan } from "@/lib/types";

/** Wizard Shoot day step — shared implementation with helper (AURA-068). */
export function ShootDayStep({
  shoot,
  plan,
  onChanged,
}: {
  shoot: Shoot;
  plan: ShootPlan | null;
  onChanged: () => Promise<unknown>;
}) {
  return (
    <SessionShootDay
      sessionId={shoot.id}
      variant="embedded"
      plan={plan}
      projectId={shoot.projectId || shoot.clientId}
      onChanged={onChanged}
    />
  );
}
