import { goneApiResponse } from "@/lib/api-deprecation";

/** Removed — use `/api/sessions` (AURA-384). */
export async function GET() {
  return goneApiResponse("/api/sessions");
}

/** Removed — use `/api/sessions` (AURA-384). */
export async function POST() {
  return goneApiResponse("/api/sessions");
}
