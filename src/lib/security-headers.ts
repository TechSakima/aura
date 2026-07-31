/**
 * HTTP security headers + CSP (AURA-390).
 * Used from `next.config.ts` (static) and optionally middleware.
 *
 * CSP ships Report-Only by default. Set `AURA_CSP_ENFORCE=1` to enforce.
 */

export type SecurityHeader = { key: string; value: string };

/** CSP allowlist tuned for Aura (Next, Firebase Auth, R2, Google OAuth, Stripe Checkout). */
export function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    // Next hydration / bundles; tighten with nonces before dropping unsafe-* (follow-up).
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://*.googleapis.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
      "https://*.cloudfunctions.net",
      "https://*.firebaseapp.com",
      "https://firebasestorage.googleapis.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://*.r2.cloudflarestorage.com",
      "https://*.r2.dev",
      "https://accounts.google.com",
      "https://oauth2.googleapis.com",
      "https://www.googleapis.com",
      "https://checkout.stripe.com",
      "https://api.stripe.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://www.googletagmanager.com",
    ].join(" "),
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    [
      "form-action 'self'",
      "https://accounts.google.com",
      "https://checkout.stripe.com",
      "https://connect.stripe.com",
    ].join(" "),
    [
      "frame-src 'self'",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://checkout.stripe.com",
      "https://connect.stripe.com",
      "https://accounts.google.com",
      "https://*.firebaseapp.com",
    ].join(" "),
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ];
  return directives.join("; ");
}

export function cspEnforceEnabled(): boolean {
  const raw = process.env.AURA_CSP_ENFORCE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Headers for every HTML/document response (AURA-390). */
export function securityHeaders(opts?: {
  /** Override NODE_ENV for tests */
  isProduction?: boolean;
  enforceCsp?: boolean;
}): SecurityHeader[] {
  const isProduction =
    opts?.isProduction ?? process.env.NODE_ENV === "production";
  const enforce = opts?.enforceCsp ?? cspEnforceEnabled();
  const csp = buildContentSecurityPolicy();

  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    {
      key: enforce
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
      value: csp,
    },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
