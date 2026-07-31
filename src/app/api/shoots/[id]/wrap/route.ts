import { goneApiResponse } from "@/lib/api-deprecation";

/** Removed — use `/api/sessions/[id]/wrap` (AURA-384). */
export async function GET() {
  return goneApiResponse("/api/sessions");
}

/** Removed — use `/api/sessions/[id]/wrap` (AURA-384). */
export async function POST() {
  return goneApiResponse("/api/sessions");
}
