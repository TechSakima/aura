# ADR: Dual-model retirement + persistence (AURA-198 / AURA-273 / AURA-126 / AURA-280)

## Status

Accepted. W7 complete 2026-07-29. DoD **AURA-273** / **AURA-272** / **AURA-280** current as of 2026-07-30.

## Context

Aura had parallel entities: `Client`/`Shoot` (legacy) and `Project`/`ProjectSession` (canonical). Dual-write and dual-read caused resurrection bugs, N+1 fetches, and terminology confusion. Hot paths also full-rewrote the studio document (`updateStudioDb`), which raced under multi-instance App Hosting.

## Decision — domain language

**Canonical names:** `Project` and `ProjectSession` (API nouns: `projects`, `sessions`). Product noun for proposals: **Quote** (`/api/quotes`; collection may stay `proposals` — AURA-200).

**Collection map (Firestore):**

| Canonical | Deprecated (read-only backfill) |
|-----------|--------------------------------|
| `projects` | `clients` |
| `projectSessions` | `shoots` |
| `proposals` | (noun “quote” in API; collection rename optional — AURA-200) |
| `shootPlans` | (session plans; `shootId` → `sessionId` on new writes) |

**Forbidden aliases in new code:**

- `project || client`, `session || shoot` outside `normalizeDb`
- `shootId` when `sessionId` is set (proposals, galleries, plans, analytics)
- `shootDate` when `startsAt` exists
- `Client`, `Shoot` types — use `Project`, `ProjectSession`

**Admin UI:** entity labels are **Project** / **Session** only (AURA-086 / **AURA-278**). Activity copy like “Shoot day” (wizard step) is allowed.

**Admin URLs:** Canonical paths and legacy redirects → [`ADMIN_ROUTES.md`](ADMIN_ROUTES.md) (AURA-063). Prefer `admin-deep-links` helpers in new code.

**API:** `/api/projects`, `/api/sessions` (+ `plan` / `wizard` / `wrap`), `/api/quotes` are canonical. `/api/clients` and `/api/shoots` remain deprecated aliases with `Deprecation` / `X-Aura-Canonical` until **AURA-384** (W14).

**Read path:** `loadStudioDatabase` skips `clients`/`shoots` when canonical is non-empty (AURA-167). `normalizeDb` backfills from legacy only when canonical empty. **`AURA_LEGACY_COLLECTIONS=0`** disables all legacy collection reads (AURA-273).

**Write path:** `persistStudioDatabase` writes `projects`/`projectSessions` only; no dual-write (AURA-168). Delete cascades still delete from legacy collections to avoid resurrection.

## Decision — persistence model (AURA-126 / AURA-002 / AURA-272)

**Target:** per-entity writes. Prefer:

| Helper | Use when |
|--------|----------|
| `appendStudioDoc` | New docs (notifications, events, contact, outbox) |
| `patchStudioDoc` / `updateStudioDoc` | Field updates on one doc |
| `appendStudioPhotos` | Gallery photo batches |
| `deleteStudioDocs` | Explicit deletes / cascades |
| `writeStudioCollection` | Upsert-only bulk (never delete-missing) |

**Avoid on hot / public paths:** full-studio `updateStudioDb` RMW. Public gallery traffic, favorites, comments, contact, and analytics must not rewrite the whole studio.

**Still OK:** rare admin mutations that already load a studio bundle and need multi-doc consistency — prefer narrowing over time (**AURA-055** for photos/analytics off every path).

**Multi-instance:** upsert-only collection writes + per-doc patches prevent wipe races. Shared rate-limit store remains **AURA-107**.

## Agent contract (AURA-280 / AURA-303)

Peers — same weight, always apply:

| Rule | File |
|------|------|
| One issue / wave order | `.cursor/rules/aura-one-issue-at-a-time.mdc` |
| Unified UI | `.cursor/rules/aura-unified-ui.mdc` |
| Design tokens / primitives | `.cursor/rules/aura-design-system.mdc` |
| Responsive (375px) | `.cursor/rules/aura-responsive.mdc` |
| PWA | `.cursor/rules/aura-pwa.mdc` + `docs/PWA_SERVICE_WORKER.md` |
| UI copy | `.cursor/rules/aura-ui-copy.mdc` |

Backlog source of truth: [`docs/AURA_ISSUES.md`](AURA_ISSUES.md) (Performance / Responsive / PWA bars apply to every item).

Do not extend dual-model aliases or full-studio RMW on public paths. Missing UI primitives → extend `components/ui` or open a backlog ID — never a permanent page-local control.

## Remaining follow-ups

- **AURA-384** — delete `/api/clients` + `/api/shoots` (W14)
- **AURA-200** — optional `proposals` → `quotes` collection rename
- **AURA-055** — stop loading all photos/analytics on every admin mutation (blocked until safer migration)
- **AURA-149** — generalize email outbox beyond contact
