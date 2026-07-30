# ADR: Dual-model retirement (AURA-198)

## Status

Accepted (W7 complete 2026-07-29).

## Context

Aura had parallel entities: `Client`/`Shoot` (legacy) and `Project`/`ProjectSession` (canonical). Dual-write and dual-read caused resurrection bugs, N+1 fetches, and terminology confusion.

## Decision

**Canonical names:** `Project` and `ProjectSession` (API nouns: `projects`, `sessions`).

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
- `Client`, `Shoot` types — use `Project`, `ProjectSession` (aliases exist for gradual migration)

**Per-entity persist:** Prefer `updateStudioDoc`, `patchStudioDoc`, `appendStudioDoc`, `appendStudioPhotos` over full `updateStudioDb` on hot paths (AURA-002/003).

**Read path:** `loadStudioDatabase` skips `clients`/`shoots` scans when canonical is non-empty (AURA-167). `normalizeDb` backfills from legacy only when canonical empty.

**Write path:** `persistStudioDatabase` writes `projects`/`projectSessions` only; no dual-write (AURA-168). Delete cascades still delete from legacy collections to avoid resurrection.

**API aliases:** `/api/clients`, `/api/shoots` remain for one release; `/api/projects`, `/api/sessions`, `/api/quotes` are canonical.
