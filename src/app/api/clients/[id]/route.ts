import { goneApiResponse } from "@/lib/api-deprecation";

/** Removed — use `/api/projects/[id]` (AURA-384). */
export async function GET() {
  return goneApiResponse("/api/projects");
}

/** Removed — use `/api/projects/[id]` (AURA-384). */
export async function PATCH() {
  return goneApiResponse("/api/projects");
}

/** Removed — use `/api/projects/[id]` (AURA-384). */
export async function DELETE() {
  return goneApiResponse("/api/projects");
}
