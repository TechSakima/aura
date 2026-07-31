import { goneApiResponse } from "@/lib/api-deprecation";

/** Removed — use `/api/sessions/[id]/wizard` (AURA-384). */
export async function GET() {
  return goneApiResponse("/api/sessions");
}
