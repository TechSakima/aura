# Custom domain (future — AURA-238)

## Current product

Studio public sites ship at **`/h/{slug}`** on the Aura app host (same origin as booking `/book/{slug}`).

- Site builder and Website settings use slug + publish only.
- No DNS UI, CNAME wizard, or “bring your domain” flow in admin.
- Do **not** block publish, preview, or layout save on custom-domain setup.

## Deferred (not in W10)

Per-studio hostname mapping (e.g. `www.studio.com` → that studio’s homepage) is optional later. Rough shape when we pick it up:

1. Studio stores a verified hostname (and optional apex redirect).
2. Edge / host routing resolves hostname → `studioId` (indexed; O(1), not full DB scan).
3. TLS via platform (e.g. managed certs) — not studio-uploaded certs in v1.
4. Public path may stay `/` on the custom host while Aura-host `/h/{slug}` remains valid.

Related deferred item: **custom email From domain** (Resend per-studio DNS) — see `docs/studio-os/ROADMAP.md` Locked decisions. That is separate from website hostname.

## Anti-patterns

- Teasing “custom domain” in Settings without a working path
- Requiring DNS before Publish
- Building a half-finished CNAME checklist that traps builders
