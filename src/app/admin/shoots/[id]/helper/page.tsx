"use client";

import { useParams } from "next/navigation";
import { SessionShootDay } from "@/components/admin/SessionShootDay";

/** Full-screen session day — same component as wizard step (AURA-068 / AURA-139). */
export default function ShootHelperPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <SessionShootDay sessionId={id} variant="page" />;
}
