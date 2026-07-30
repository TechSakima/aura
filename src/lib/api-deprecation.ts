import { NextResponse } from "next/server";

/** Mark legacy `/api/clients` / `/api/shoots` responses (AURA-273 / AURA-197). */
export function withApiDeprecation(
  res: NextResponse,
  successorPath: string,
): NextResponse {
  res.headers.set("Deprecation", "true");
  res.headers.set("Link", `<${successorPath}>; rel="successor-version"`);
  res.headers.set("X-Aura-Canonical", successorPath);
  return res;
}
