# Aura — Comprehensive Web & PWA Audit

**Date:** 2026-07-31  
**Method:** Code-grounded pass across architecture, PWA/offline, CWV, client state, security, a11y/responsive.  
**Backlog action:** Open findings filed as **AURA-388+** in [`AURA_ISSUES.md`](AURA_ISSUES.md) wave **W15**.  
**Do not re-implement:** Closed W0–W14 / Phase 18 PWA (**288–303 / 368 / 385**) foundations that already match the bars below.

---

## Pre-execution map

| Assumption | Aura implication |
|------------|------------------|
| Hostile / flaky network | Offline navigate → `/offline.html` (AURA-394); book/workflow mutations use mutateJson (AURA-399) |
| Multi-browser / device | Admin icons public via `studio=` (AURA-400); WebKit standalone already has safe-area shells |
| Silent failure modes | Residual in-process limits on some non-money routes (auth/money/docs shared — AURA-392); HMAC fail-closed — AURA-389 |
| Scale | Book/dashboard light reads (AURA-407); gallery/download/counts scoped (395–397); fonts = 2 root + kit on demand (AURA-398) |

**Stack (current):** Next.js App Router (hybrid SSR + client islands), Firebase Auth + Admin SDK, Firestore, Cloudflare R2 media, Resend, Stripe Connect, scoped service worker `public/sw.js` v7.

---

## Already solid (do not reopen)

| Domain | Evidence |
|--------|----------|
| Persist / RMW | Upsert-only collections; public paths avoid `updateStudioDb`; **AURA-055** skips photos/analytics on mutations by default |
| Auth cookies | HttpOnly + Secure (prod) + SameSite=Lax; HMAC cookie; middleware Edge gate; `requireAdmin` membership check |
| Media | R2 signed downloads; HMAC media proxy; originals PIN-gated; SW media budget thumbs/previews only |
| XSS | No `dangerouslySetInnerHTML`; email `escapeHtml`; contracts as text |
| PWA matrix | Per-surface manifests (admin / `/g` / `/h`+`/book` / lightweight `/p` `/c` `/pay`); InstallHint; OfflineStatus; standalone chrome |
| Responsive | 375 gates, AdminShell hamburger/tabs, safe-area on sticky chrome (W12) |
| Unified UI | Tokens + `components/ui` + shells |

---

## A. Core Architecture & Codebase Integrity

### Findings

#### Critical — Gallery API still materializes all photos before paging
~~`listPhotosByGalleryId` then slice.~~ **Fixed AURA-395** — `listPhotosByGalleryIdPage` + aggregation count.

- [x] **AURA-395** · P0 · Performance · Server-side gallery photo page query (limit/offset or cursor in Firestore; never load-all-then-slice)

**Before:** Page 1 of 5k photos still reads 5k docs.  
**After:** Query returns only the page (plus cheap total/hasMore).

#### Critical — `countPhotosByGalleryId` is full-list `.length`
~~Full-list `.length`.~~ **Fixed AURA-396** — Firestore aggregation `.count()`.

- [x] **AURA-396** · P0 · Performance · Photo counts via aggregation / `select()` count — not materialize-all

#### High — Public download still `readStudioDb` + filter photos
~~Full studio read.~~ **Fixed AURA-397** — gallery-scoped `listPhotosByGalleryId` / `getPhotosByIds`.

- [x] **AURA-397** · P1 · Performance · Download path: gallery-scoped photo list only (pair 395)

#### High — Six `next/font/google` families on root layout
~~Six fonts on root.~~ **Fixed AURA-398** — root Fraunces+Figtree; kit faces on demand.

- [x] **AURA-398** · P1 · Performance · Font strategy: subset + load kit fonts on demand (admin may use one kit only)

#### High — Monolithic client islands
`src/app/g/[token]/page.tsx` (~1.3k lines); `GalleryDesignPanel`, `WebsiteBuilder`, `DeliveryStep`, documents page remain huge client bundles.

- [x] **AURA-411** · P2 · Performance · Split gallery guest page (hero / grid / lightbox / download) into lazy chunks + route `loading.tsx`  
  **Done:** overlays in `lazy-gallery-overlays` async chunk; hero/grid stay eager; route `loading.tsx` from **401**.

#### High — Book GET / dashboard still heavy reads
~~Full `readStudioDb`.~~ **Fixed AURA-407** — book GET session types only; dashboard light load.

- [x] **AURA-407** · P1 · Performance · Book + dashboard: `readStudioDb({ photos:false, analytics:false })` or scoped lists

#### Medium — No App Router `loading.tsx` / `error.tsx`
~~Zero under `src/`.~~ **Fixed AURA-401** — admin + `/g` `/h` `/book` loading/error shells.

- [x] **AURA-401** · P2 · UX · Add `loading.tsx` / `error.tsx` for admin, `/g`, `/h`, `/book` (streaming + a11y recovery)

---

## B. PWA Capabilities & Offline Resilience

### Findings

#### Critical — Static PWA icons missing (SW precache fails)
`public/` has only `icon-512-maskable.png`. **`icon-192.png` / `icon-512.png` absent** but listed in `public/sw.js` PRECACHE and fallback manifests. One 404 fails `cache.addAll` → SW may never activate.

- [x] **AURA-388** · P0 · PWA · Commit `public/icon-192.png` + `public/icon-512.png` (or generate at build); verify SW install

**Before:** Audit tools missed git-tracked icons; `cache.addAll` still brittle.  
**After:** `npm run icons` regenerates 192/512/maskable; SW v6 precaches per-URL so one miss cannot abort install.

#### High — No `controllerchange` reload after `skipWaiting`
~~No reload on new controller.~~ **Fixed AURA-393** — reload once on update `controllerchange`.

- [x] **AURA-393** · P1 · PWA · On `controllerchange`, reload once (or soft “Update available” banner)

#### High — Cached App Router HTML without `/_next` assets
~~Page-cached HTML without chunks.~~ **Fixed AURA-394** — SW v7: no HTML page cache; offline → `/offline.html`.

- [x] **AURA-394** · P1 · PWA · Offline navigate honesty: serve `/offline.html` unless document + critical assets are cacheable together (or stop caching App Router HTML)

#### High — Admin manifest icons require session
~~`surface=admin` → 401.~~ **Fixed AURA-400** — admin manifest uses `studio=`; legacy surface fails open to static.

- [x] **AURA-400** · P1 · PWA · Admin icons: public/static fallback (no cookie required for OS icon fetch)

#### High — Book + many admin mutations not offline-honest
~~Bare fetch.~~ **Fixed AURA-399** — book + ProjectWorkflowPanel use `mutateJson` + clear pending.

- [x] **AURA-399** · P1 · Reliability · Book + project workflow mutations: `mutateJson` / offline toast; never stuck pending

#### Medium — Unknown gallery token still installable
~~“Aura Gallery” for missing tokens.~~ **Fixed AURA-402** — 404 manifest; layout omits install link.

- [x] **AURA-402** · P2 · PWA · Unknown/missing gallery → 404 manifest (no junk install)

#### Medium — Gallery InstallHint dismiss is global
~~Not per-token.~~ **Fixed AURA-403** — `aura-install-dismiss-g-${token}`.

- [x] **AURA-403** · P2 · PWA · Install dismiss key per gallery token

#### Low — No client Background Sync / IndexedDB mutation outbox
Server email outbox exists; client queues are intentional non-goals (honesty over fake sync). Document only — no ID unless product asks.

#### Doc drift
AURA-368 completion note says SW never caches `/api/media`; v5 + AURA-300 caches thumbs under budget. Fix note when closing 388/394.

---

## C. Performance & Core Web Vitals

Covered primarily by **395–398, 401, 407, 411**.

#### Medium — Masonry uses raw `<img>`
~~No sizes/srcset; CLS if aspect missing.~~ **Fixed AURA-412** — `GalleryThumb` + srcSet/sizes + reserved aspect.

- [x] **AURA-412** · P2 · Performance · Gallery thumbs: width/height or aspect reserved + responsive `sizes` (next/image or equivalent)

#### Medium — Lightbox fires `photo-view` analytics every open
~~Extra RTT every open.~~ **Fixed AURA-413** — session-dedupe; fire-and-forget on selected photo.

- [x] **AURA-413** · P3 · Performance · Debounce/coalesce photo-view analytics (session-dedupe)

---

## D. Client State, Storage & Data Boundaries

| Storage | Usage | Verdict |
|---------|-------|---------|
| Cookie `aura_session` | Admin auth | Correct (HttpOnly) |
| IndexedDB | Firebase Auth persistence only | Intentional |
| localStorage / sessionStorage | Prefs, install dismiss, coach, last route | OK — not source of truth |
| Cache Storage | SW v5 buckets | See PWA gaps |

#### High — Shoot-day optimistic race
~~Stale full-plan rollback.~~ **Fixed AURA-404** — functional updates; field-scoped rollback.

- [x] **AURA-404** · P1 · Bug · Shoot-day optimistic updates: functional setState / version token; no stale rollback wipe

#### Medium — Favorites concurrent RMW
~~RMW without txn.~~ **Fixed AURA-406** — `toggleVisitorFavorite` Firestore transaction.

- [x] **AURA-406** · P2 · Reliability · Favorites toggle: Firestore txn or field-level union/remove

#### Medium — NotificationBell optimistic mark-read with no rollback
~~Plus no focus trap.~~ **Fixed AURA-405** — `useFocusTrap` + mark-read/mark-all rollback.

- [x] **AURA-405** · P2 · a11y · NotificationBell: focus trap + Escape; mark-read failure rollback

---

## E. Security, Privacy & Auth

### Findings

#### Critical — Crypto secrets fall back to public / literals
~~`session-cookie.ts`, `media-proxy-token.ts`, `homepage-unlock.ts`, `google-token-crypto.ts` fall back through `NEXT_PUBLIC_APP_URL` or literals.~~ **Fixed AURA-389** via `crypto-secrets.ts` + App Hosting `AURA_SESSION_SECRET`.

- [x] **AURA-389** · P0 · Security · Production fail-closed if HMAC secrets unset; never derive from `NEXT_PUBLIC_*`; document App Hosting secrets

**Before:** Knowing app URL can forge media-proxy signatures.  
**After:** Missing secret → 503 on mint; verify fail-closed; deploy requires `AURA_SESSION_SECRET`.

#### High — No CSP / security headers
~~Absent from next.config.~~ **Fixed AURA-390** — Report-Only CSP + static security headers; enforce via `AURA_CSP_ENFORCE`.

- [x] **AURA-390** · P1 · Security · Headers: CSP (report-then-enforce), `frame-ancestors`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS (prod)

#### High — Google OAuth missing `state`
~~Missing state.~~ **Fixed AURA-391** — signed cookie + authorize `state` verify on callback.

- [x] **AURA-391** · P1 · Security · Google OAuth `state` cookie + verify on callback

#### High — Auth + several public POSTs still in-process rate limit
~~Login/signup unrate-limited; money/docs in-process.~~ **Fixed AURA-392** — `rateLimitShared` on auth + pay/book/accept/sign/cancel/questionnaire.

- [x] **AURA-392** · P1 · Security · `rateLimitShared` on login/signup + pay/book/accept/sign/cancel/questionnaire; tighten caps

#### Medium — `/api/status` unauthenticated disclosure
~~Firebase project id, R2 flags, hostnames.~~ **Fixed AURA-408** — prod public `{ ok, error }`; full payload for admins.

- [x] **AURA-408** · P2 · Security · `/api/status` admin-only or strip sensitive fields in prod

#### Medium — `clientIp` trusts first `X-Forwarded-For`
~~Leftmost XFF.~~ **Fixed AURA-414** — CF-Connecting-IP → rightmost XFF → X-Real-IP.

- [x] **AURA-414** · P2 · Security · Trust only platform-forwarded client IP (last/rightmost or CF-Connecting-IP)

#### Medium — No Origin check on admin cookie mutations
~~SameSite only.~~ **Fixed AURA-415** — middleware Origin/Referer allowlist on admin API mutations.

- [x] **AURA-415** · P3 · Security · Optional Origin/Referer allowlist on admin mutating APIs

#### Low — Quote public GET spreads full proposal object
~~Full proposal spread.~~ **Fixed AURA-416** — `toPublicProposal` allowlist on GET/POST.

- [x] **AURA-416** · P3 · Privacy · Public quote payload: allowlist fields only

---

## F. UI/UX, Accessibility & Responsiveness

### Strengths
Dialog / Confirm / lightbox focus traps; gallery keyboard nav; tokens for on-media; 375 admin/public work largely closed in W12.

### Findings

#### Medium — NotificationBell focus (see 405)

#### Medium — Small muted contrast
~~`--muted` may fail WCAG AA.~~ **Fixed AURA-409** — darker root/kit muted + gallery chrome/AlbumNav `text-xs`.

- [x] **AURA-409** · P2 · a11y · Contrast audit: muted/small text; bump token or size on gallery chrome/coach

#### Medium — Dialog background not `inert`
- [x] **AURA-417** · P3 · a11y · Dialog: `inert` / `aria-hidden` on siblings while open

#### Medium — Tablet `roomy` chrome flip + dense builders
~~768 flip + dense builders.~~ **Fixed AURA-410** — `desk` (1024×560) for chrome; builders stay step/2-col until `lg`.

- [x] **AURA-410** · P2 · Responsive · Soften `roomy` transitions; builders usable at 768 without horizontal scavenger UI

#### Low — `/q` `/cancel` lack lightweight PWA chrome
~~Optional vs AURA-299 scope.~~ **Fixed AURA-418** — theme-color + manifests + InstallHint; no SW.

- [x] **AURA-418** · P3 · PWA · Lightweight theme-color (+ optional manifest) for `/q` and `/cancel`

---

## Priority execution order (W15)

| Order | ID | Sev | Theme |
|-------|-----|-----|-------|
| 1 | **388** | P0 | Static PWA icons / SW install |
| 2 | **389** | P0 | HMAC secrets fail-closed *(done)* |
| 3 | **395** | P0 | Gallery photo server paging *(done)* |
| 4 | **396** | P0 | Photo count without full load *(done)* |
| 5 | **390** | P1 | Security headers / CSP *(done)* |
| 6 | **391** | P1 | Google OAuth state *(done)* |
| 7 | **392** | P1 | Shared rate limits (auth + public money/docs) *(done)* |
| 8 | **393** | P1 | SW update reload *(done)* |
| 9 | **394** | P1 | Offline HTML honesty *(done)* |
| 10 | **397** | P1 | Download scoped photos *(done)* |
| 11 | **399** | P1 | Offline-honest book/workflow *(done)* |
| 12 | **400** | P1 | Admin icons without auth *(done)* |
| 13 | **398** | P1 | Font strategy *(done)* |
| 14 | **404** | P1 | Shoot-day optimistic race *(done)* |
| 15 | **407** | P1 | Book/dashboard light reads *(done)* |
| 16+ | **401–403, 405–406, 408–418** | P2–P3 | Residual polish |

---

## Domain scorecard (post W14 vs audit)

| Domain | Post-W14 claim | Audit verdict |
|--------|----------------|---------------|
| Architecture / persist | Strong | Strong; book/dashboard light (407) |
| PWA productization | Phase 18 done | Foundations solid; icons + SW update/offline HTML fixed (388/393/394) |
| Performance | 055 done | Gallery/download scoped (395–397); book/dashboard light (407) |
| Security | Tokens/HMAC/proxy | Cookie flags good; HMAC fail-closed + CSP Report-Only (AURA-389/390) |
| a11y / responsive | W12 deep pass | Core solid; bell/muted/tablet chrome (405/409/410) |
| Offline mutations | mutateJson | Book + workflow covered (AURA-399) |
