import { goneApiResponse } from "@/lib/api-deprecation";

/** Removed — use `/api/projects` (AURA-384). */
export async function GET() {
  return goneApiResponse("/api/projects");
}

/** Removed — use `/api/projects` (AURA-384). */
export async function POST() {
  return goneApiResponse("/api/projects");
}
