# Aura — Master Issues Backlog

**Purpose:** Single ordered backlog that fully refines Aura — product, UX, UI, workflow, polish, architecture, reliability, performance, BE/FE unification, modular studio website + client gallery, **Cloudflare R2 media**, **unified studio Settings**, **client→studio contact via Resend**, **fully responsive**, and **PWA-ready** (admin + public).  
**Rules (all always-apply; peer weight):**  

- One open item per prompt → `[.cursor/rules/aura-one-issue-at-a-time.mdc](../.cursor/rules/aura-one-issue-at-a-time.mdc)`  
- Unified UI → `[.cursor/rules/aura-unified-ui.mdc](../.cursor/rules/aura-unified-ui.mdc)`  
- Design tokens → `[.cursor/rules/aura-design-system.mdc](../.cursor/rules/aura-design-system.mdc)`  
- Responsive → `[.cursor/rules/aura-responsive.mdc](../.cursor/rules/aura-responsive.mdc)`  
- PWA → `[.cursor/rules/aura-pwa.mdc](../.cursor/rules/aura-pwa.mdc)` · SW strategy → `[docs/PWA_SERVICE_WORKER.md](PWA_SERVICE_WORKER.md)`  
- UI copy → `[.cursor/rules/aura-ui-copy.mdc](../.cursor/rules/aura-ui-copy.mdc)`  
- Domain + persist ADR → [`docs/ADR-dual-model-retirement.md`](ADR-dual-model-retirement.md) · agent entry → [`AGENTS.md`](../AGENTS.md)

**Status legend:** `[ ]` open · `[~]` in progress · `[x]` done · `[!]` cancelled / superseded (do not implement)  
**Severity:** P0 ship-blocker / data-loss / security · P1 important · P2 polish · P3 nice-to-have

---

## How to work this list

1. Find the **next** open item using **Canonical execution order** (below) — **not** “lowest ID number.” IDs are stable labels; waves are dependency order.
2. Do **only** that item in the current prompt.
3. Mark it `[x]` when done (and briefly note the fix in the Completion log).
4. Do not skip ahead unless the user explicitly overrides (“skip AURA-###” / “do AURA-### next”).
5. Prefer fixing root causes named in the item; avoid drive-by refactors outside the item’s scope.
6. After a P0 data/persistence fix, re-verify dependent workflow items before marking later ones done.
7. Every fix must satisfy the **Performance**, **Responsive**, and **PWA** bars below (no regressions).
8. Skip `[!]` items. If an item says “after AURA-###”, do the dependency first even if it appears later in a phase dump.

### Canonical execution order (source of truth)

Work top → bottom. Within a wave, keep listed sequence.


| Wave    | Goal                            | Do these (open / remaining)                                                                                             | Do not start until                                                        |
| ------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **W0**  | Data honesty & security         | **001** → **152** → **002** → **003** → **004** → **005** → **006** → **007** → **008**                                 | —                                                                         |
| **W1**  | Cloudflare R2 delivery          | **358** (verify `.env.local` + smoke upload) → **355** → **356** → **357** → **359** → **360** → **362** (361 optional) | W0 done (persist safe before media cutover)                               |
| **W2**  | Money truth                     | **009** → **016** (Phase 1), then **365** pay idempotency                                                               | W0                                                                        |
| **W3**  | Happy-path pipeline             | **017** → **030** (Phase 2), then **369** GCal scope                                                                    | W0; W2 for deposit/pay honesty                                            |
| **W4**  | Public client surfaces          | **031**–**050** except **037** (downloads) runs **after W1 355/356**, then **364** zip TTL/skips                        | W0; W1 for download-related                                               |
| **W5**  | Admin load/perf                 | **051**–**057** (**055** done), then **367** null email                                                                 | W0 (002/003 especially)                                                   |
| **W6**  | Delivery / wrap polish          | **366** archive egress, then **073**–**081**                                                                            | W1 for upload/download paths                                              |
| **W7**  | BE/FE unification               | **153**–**200** (**151** is `[!]` — folded into 001)                                                                    | W0 (001/152/002)                                                          |
| **W8**  | Unified UI primitives           | **201**–**221**, then **363** (Dialog viewport portal)                                                                  | Prefer before mega UI rebuilds; may land earlier when a screen is touched |
| **W9**  | Settings OS                     | **349**–**353** (**317**–**348**/ **070**/ **087**/ **090**/ **091**/ **098**/ **123**/ **121**/ **265**/ **310** done) | W8 where ThemeSwatch etc. noted                                           |
| **W10** | Website + gallery designer      | **222**–**259**                                                                                                         | W8 tokens; W9 Brand/Website; W1 media                                     |
| **W11** | Contact (Resend)                | **304**–**316**, then **371**–**374** (project inbound Reply-To)                                                        | W0; **041** escape before **306**; **315** before **371**                 |
| **W12** | Responsive + PWA productization | **281**–**287**, pull **088**/**089**, then **375**–**383** (deep audit), then **288**–**303**, **368**, **385**       | Continuous bar always; this wave closes systemic gaps                     |
| **W13** | No-headache workflows + DoD     | **260**–**280** + residual through **369** done → **W14**                                                               | Prior foundations                                                         |
| **W14** | Leftover polish                 | **384**/**386**/**387**/**200**/**370**/**055** done                                                                    | —                                                                         |
| **W15** | Web/PWA audit residuals         | **complete** (through **418**) | W0–W14 done; full report [`WEB_PWA_AUDIT.md`](WEB_PWA_AUDIT.md)           |
| **W16** | Contact vs booking IA           | **complete** (through **421**) | After W15; Bookings = intake; project Messages only after project exists |
| **W17** | UI / responsive residuals       | **complete** (through **460**) | After W16; deep dive + second pass 2026-07-31 — canvas `ui-responsive-audit` |
| **W18** | Post-W17 residual audit         | **complete** (through **479**) | After W17; third-pass audit 2026-07-31 — canvas `post-w17-residual-audit` |


**Next to implement:** first open checkbox after **W18** (none in wave order — backlog complete through **479**).

**R2:** **W0–W18** complete.

**Dedup (do not double-implement):**


| Keep                              | Superseded                                                          |
| --------------------------------- | ------------------------------------------------------------------- |
| **001** (+ regression test)       | **151** → `[!]`                                                     |
| **317+** Settings IA              | **070** closed with 317 stopgap routes                              |
| **355/356** download architecture | **037** polish **after** 355/356                                    |
| **202** theme var parity          | covers much of **031** — close 031 via 202 when fixing dark gallery |
| **212** ShootDay Dialog overlay   | **138** → `[x]` verified (same work)                                |


### Performance bar (applies to every item)

When implementing any AURA-###:

- **Do not** add new call sites that full-rewrite the studio (`updateStudioDb` over hot public paths) once AURA-002/003 are open or done — use per-doc / append-only patterns.
- **Do not** introduce N+1 API fan-out from list/detail pages; batch or expand the project/session bundle.
- **Do not** load all photos/analytics into memory for a small mutation; scope reads/writes to the entity.
- Prefer **O(entity)** work over **O(studio)** work. Document any intentional exception in the Completion log.
- Public gallery/view paths must stay cheap: no heavy RMW on view, favorite, or photo-open.
- Measure mentally: “What happens with 5k photos, 50 projects, multi-instance App Hosting?” If it breaks, the fix is wrong.
- UI refactors must not ship unused CSS/JS bloat; reuse primitives rather than duplicating theme/CSS.
- **Media:** After W1 **355+**, do not proxy originals through App Hosting for client download — R2 signed URLs.

### Responsive bar (applies to every UI item)

- Mentally (or actually) verify **375px** and **768px**. Desktop-only layouts are incomplete.
- No horizontal page scroll at 375px; touch targets ≥ **44×44**; sticky chrome must not eat half the viewport.
- Forms single-column below `sm`; dense tables become stacked cards or contained scrollers.
- Website builder / gallery designer: **375px preview required** for modules before calling a design feature done.
- Prefer safe-area insets (`env(safe-area-inset-*)`) on sticky/fixed chrome for notched phones and installed PWAs.
- Full contract: `aura-responsive.mdc`.

### PWA bar (applies to admin + public surfaces)

- Installable where intended: valid **manifest** (name, icons 192/512 + maskable, `theme_color` / `background_color` from brand/theme — not hardcoded light Aura defaults on branded galleries).
- **Service worker** registered; updates don’t brick the app; offline fallback is honest (cached shell or clear “you’re offline” — never a silent blank).
- Standalone / installed mode: no broken auth redirects, no content under the notch, bottom nav / CTAs clear of home-indicator.
- Scope manifests correctly: studio admin vs gallery token vs homepage/book vs lightweight quote/contract/pay — clients should not get a confusing “Aura Studio” install when viewing a wedding gallery.
- Do not cache authenticated admin API responses carelessly; prefer network-first for studio data. Media SW cache = thumbs/previews only under budget (never originals).
- Full contract: `aura-pwa.mdc` · `docs/PWA_SERVICE_WORKER.md`.

---

## Phase 0 — Data integrity & security (do first)

- [x] **AURA-001** · P0 · DataModel · `src/lib/db/normalize.ts`  
  Preserved `workflowStep` + `cancelToken` in `coerceProject`; `projectRoundTripPreserved()` helper. (**Supersedes AURA-151.**)

- [x] **AURA-002** · P0 · Reliability · `src/lib/db/store.ts`  
  Upsert-only `writeStudioCollection` (no delete-missing). Added `deleteStudioDocs` / `appendStudioDoc` / `patchStudioDoc` / `updateStudioDoc`. Cascades + archive use explicit deletes. Hot paths migrated: favorites, comments, gallery expire, notifyStudio. (`recordEvent` → AURA-003.)

- [x] **AURA-003** · P0 · Performance · `src/lib/analytics.ts`  
  `recordEvent` uses `appendStudioDoc` (append-only) — public gallery traffic no longer full-rewrites the studio.

- [x] **AURA-004** · P0 · Security · `src/app/api/public/pay/[id]/route.ts`  
  Removed local fake-charge fallback. Public pay fails closed (503/502) unless Stripe Checkout starts; UI no longer treats non-checkout success as paid.

- [x] **AURA-005** · P0 · Bug · `src/app/api/public/galleries/[token]/favorites/route.ts` + gallery page  
  Per-visitor favorites via `aura_visitor` cookie + `galleryFavorites` collection (not on gallery doc). GET/POST favorites, download favorites, cascade cleanup. Public gallery no longer exposes shared hearts.

- [x] **AURA-006** · P0 · Security · Public gallery/proposal token APIs
  `assertPublicGalleryAccess` / `assertPublicProposalAccess`: draft/archived galleries 404 unless studio admin preview; mutate only when `live`; quote view draft=admin preview; accept only `sent` (idempotent `accepted`).

- [x] **AURA-007** · P0 · Reliability · `src/lib/google-calendar.ts` (busy intervals)
  `getBusyIntervals` returns `{ busy, syncFailed }`; token/freeBusy failures fail closed (503 on public book + admin confirm) instead of empty busy.

- [x] **AURA-008** · P0 · Bug · `src/app/api/public/subalbums/[token]/route.ts`
  Photo `url` / `thumbUrl` now go through `resolveMediaUrl` (match gallery API).

---

## Phase 0b — Cloudflare R2 media (Wave W1 — after W0)

**Decision:** Gallery originals, derivatives, videos, watermarks, and logos live on **Cloudflare R2**. Firebase keeps Auth, Firestore, App Hosting. Firebase Storage is fallback/legacy until migration completes.

**Why:** Clients download high-quality originals. R2 = **$0 egress**; downloads use **signed URLs** (bytes never transit Next for bulk).

**Local status:** Smoke PASS (`npm run r2:smoke`). App Hosting secrets `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` set + granted to backend `aura`. `apphosting.yaml` R2 block live. Prod picks up on next deploy.

- [x] **AURA-354** · P0 · Architecture · `MediaStore` adapter + R2 backend  
  Done: `src/lib/storage/{types,paths,r2-store,firebase-store,media-store,upload}.ts`. R2 when `R2_*` set; dual-read + dual-delete; writes to R2.

- [x] **AURA-358** · P1 · Ops · Provisioning + smoke verify
  `npm run r2:smoke` PASS; `apphosting.yaml` R2 block; secrets set + granted to backend `aura`. Prod needs a deploy to load secrets.

- [x] **AURA-355** · P0 · API · Signed original downloads
  After PIN: JSON `{ url }` / `{ urls[] }` via `getSignedMediaDownloadUrl` (R2 signed GET). Public gallery client opens URLs directly — no App Hosting original buffer.
- [x] **AURA-356** · P0 · API · Bulk zip off-server
  No server JSZip. API returns signed URL list; browser builds zip via `zipSignedDownloads` (JSZip). CORS: `npm run r2:cors` or dashboard paste (`docs/CLOUDFLARE_R2.md` §4b). Fallback: individual signed downloads.
- [x] **AURA-357** · P1 · Delivery · Preview/thumb without App Hosting egress
  `resolveBrowseMediaUrl`: public gallery / sub-album / homepage return R2 signed GETs (6h) for thumb/web/watermark/logo — not `/api/media` proxy. Originals stay unsigned.
- [x] **AURA-359** · P1 · Migration · Copy Firebase → R2
  `npm run r2:migrate` / `scripts/r2-migrate-from-firebase.mjs` — list `studios/**`, copy+size-verify to R2. Ran `--execute`: 72 copied, 0 failed. Firebase kept (no `--delete`) for dual-read until 360.
- [x] **AURA-360** · P1 · Cutover · Default media backend R2
  Prod/App Hosting: R2 required for writes (`MediaBackendNotConfiguredError` if missing). Local may still fall back to Firebase. Dual-read/delete via `MEDIA_DUAL_READ` (default on). Status API reports `r2Configured` / `r2RequiredInProd`.
- [x] **AURA-361** · P0 · Performance · Direct upload to R2 (unified)
  All wizard uploads: initiate → presigned PUT (<32MB) or S3 multipart (≥32MB, 32MiB parts) → complete. Photos: `processDerivativesFromOriginal` builds thumb/web/wm from R2 original. Video: registers object only. CORS: GET+HEAD+PUT (`npm run r2:cors` JSON).

- [x] **AURA-362** · P2 · DoD · HQ download economics
  Client originals: signed R2 only (no App Hosting buffer). Bulk: client zip from signed URLs. Browse: signed R2 (357) + `/api/media` **302 → signed R2** when configured. Originals still forbidden on proxy.

---

## Phase 1 — Payments, money truth, Connect

- [x] **AURA-009** · P1 · Reliability · `src/app/api/stripe/webhook/route.ts`
  `amountsFromCheckoutSession`: gross from `session.amount_total`; fee/net estimated from charged total. Metadata used for routing only (`studioId`, `paymentLinkId`, `projectId`).

- [x] **AURA-010** · P1 · Reliability · `src/lib/db/payments.ts`
  Idempotent on Checkout Session / PI (`pay_cs_…` / `pay_pi_…`); requires one of those keys; stores `stripeCheckoutSessionId`; webhook skips notify/email fanout on `duplicate`.

- [x] **AURA-011** · P1 · Bug · Webhook + `recordPaymentLinkCharge`
  Removed duplicate project stage/workflow/deposit writes from webhook; `recordPaymentLinkCharge` is the sole writer for those. Webhook keeps notify/email/Connect-complete only.

- [x] **AURA-012** · P1 · Workflow · Project deposit → Payments hub
  Payments empty state points to project Deposit + Open projects; section renamed Deposits with project link; workflow Deposit shows View in Payments.

- [x] **AURA-013** · P1 · Copy · `src/app/admin/payments/page.tsx`
  Quiet payments setup strip (Enable / Manage); no Stripe Connect heading, account ids, or fee narration in PageHeader.

- [x] **AURA-014** · P1 · UX · `src/app/pay/[id]/page.tsx`
  `?canceled=1` notice; pending submit; open-amount fee via shared `grossUpAmount`; success shows studio + charged amount (`?amount=` on success_url).

- [x] **AURA-015** · P2 · Architecture · Fee math · `src/lib/stripe-fees.ts`
  Documented US 2.9%+$0.30 destination-charge estimate limits (no pre-charge Fee API); USD-only via `DEFAULT_PAYMENT_CURRENCY` / `assertPaymentCurrency`; multi-currency deferred.

- [x] **AURA-016** · P2 · Reliability · Stripe webhooks
  Refunds/disputes/async-fail reverse paidAmount + invoice + deposit/workflow; record only when `payment_status=paid`; dispute won restores.

---

## Phase 2 — Booking → project pipeline (happy path)

- [x] **AURA-017** · P1 · Workflow · Split timelines
  One spine via `lib/workflow/path.ts`: Book → handoff (“Prep starts after deposit”) → Session; prep/delivery gated until deposit; Continue to prep CTA.

- [x] **AURA-018** · P1 · Workflow · `src/components/admin/ProjectWorkflowPanel.tsx`
  Advance / Reopen previous (+ per-step); done badges use deposit invoice/status, quote accepted, prep/delivery completion — not bare paidAmount or gallery token.

- [x] **AURA-019** · P1 · Workflow · Booking confirm
  Confirm navigates to project `#workflow` (API `workflowStep` / `projectHref`); toast names the next step.

- [x] **AURA-020** · P1 · Workflow · `projects/[id]/page.tsx` createSession
  After create: open prep only if past deposit; otherwise ask Open prep vs Stay on project.

- [x] **AURA-021** · P1 · UX · Bookings page kitchen-sink
  Tabs: Requests | Calendar | Session types (`?tab=`); one job per panel; pending count on Requests.

- [x] **AURA-022** · P1 · Workflow · Session types lifecycle
  Archive/restore via `active`; public book rejects inactive; admin Show archived; normalize defaults `active: true`.

- [x] **AURA-023** · P1 · Workflow · Booking public form · `book/[slug]`
  datetime-local `min=now`, timezone label, pending submit, debounced availability check via GET `?availability=1`.

- [x] **AURA-024** · P1 · Bug · Book API response
  Public POST returns `{ ok: true }` only; GET session types stripped to public fields (no admin href / full booking).

- [x] **AURA-025** · P1 · Reliability · Booking confirm + Google Calendar  
  Confirm mutation, conflict check, and calendar push should be consistent; surface calendar push failure; delete/update events on decline/cancel/reschedule (depends on AURA-007).

- [x] **AURA-026** · P1 · Incomplete · Google Calendar sync scope  
  Real per-studio Google OAuth only (Connect → consent → store refresh token); never mark connected without a token. Sync manual session create/edit/delete — not only booking confirm.

- [x] **AURA-027** · P1 · Workflow · Quote accept → next  
  After public quote accept (and admin Mark accepted), guide toward contract/deposit with links — don’t dead-end on “we’ll be in touch.”

- [x] **AURA-028** · P1 · Workflow · Mark accepted honesty  
  Admin “Mark accepted” should confirm it bypasses client acceptance and what it unlocks.

- [x] **AURA-029** · P1 · Workflow · Balance / final payment  
  After deposit + delivery, support a clear remaining-balance invoice/pay link from project (not only Payments hub templates).

- [x] **AURA-030** · P1 · Workflow · Wrap completion  
  Wrap should advance project/session state (delivered/completed), not only archive zip — and remind about open invoices / homepage listing if relevant.

---

## Phase 3 — Public client surfaces (shared daily)

- [x] **AURA-031** · P1 · Bug · Dark gallery themes · `galleryThemeCssVars` + lightbox/tiles  
  Dark themes remap `--ink` to light ink while overlays use `bg-ink` — lightbox becomes washed. Fix token mapping (`--ink` = text; keep overlay/scrim tokens separate) and include `--accent-ink`.
  *(Gallery theme parity + scrim/on-media landed here; AURA-201/202 may still widen token @theme coverage.)*

- [x] **AURA-032** · P1 · Bug · Theme application gaps  
  Apply gallery theme CSS vars on peek (`/g/.../peek`) and sub-album (`/s/...`). Apply studio `fontPreset` on homepage.

- [x] **AURA-033** · P1 · Bug · Mood board / media URLs  
  Resolve proposal mood-board images with `resolveMediaUrl` like logos/gallery.

- [x] **AURA-034** · P1 · Bug · Silent public failures  
  Quote accept, favorite toggle, comments, peek/proposal/sub-album loads: surface errors; never infinite “Loading…” on `!res.ok`.

- [x] **AURA-035** · P1 · UX · Gallery mobile actions  
  Favorites / download / share must work without hover; touch targets ≥44px; icon+label on small screens.

- [x] **AURA-036** · P1 · UX · Tile “Share” semantics  
  Sharing a selection vs native share / copy link — align label, multi-select, and sub-album create flow.

- [x] **AURA-037** · P1 · Bug · Downloads  
  **After AURA-355/356.** Post-R2 focus: video policy (download video or exclude explicitly with UI honesty), extension/MIME from `originalFilename` (not hardcoded “jpg”), partial-skip honesty when signed URLs fail, signed-TTL/chunking for large zips. Empty-zip-as-success is fixed; sanitize Content-Disposition remains.

- [x] **AURA-038** · P1 · UX · Public shell consistency  
  Pay, book, questionnaire, cancel, homepage password gate should share branded chrome (logo/studio mark) like quote/contract — one product, not five microsites.

- [x] **AURA-039** · P1 · A11y · Homepage password  
  Don’t put password in query string; show incorrect-password feedback.

- [x] **AURA-040** · P1 · Copy · Contract acknowledge checkbox  
  Don’t hardcode “editing restrictions and portfolio use” if body may differ — derive from terms or use neutral “I agree to this agreement.”

- [x] **AURA-041** · P1 · Bug · Email HTML injection · `src/lib/notify/send.ts`  
  Escape all interpolated client/studio strings in HTML emails (not only signed-contract copy).

- [x] **AURA-042** · P1 · Responsive · Gallery sticky chrome  
  Fix double sticky headers (hub + AlbumView); keep CTAs reachable at 375px without eating half the viewport.

- [x] **AURA-043** · P1 · Bug · PWA manifest branding  
  Gallery (+ studio) manifests: `theme_color` / `background_color` / icons / `short_name` / `name` follow brand + design schema — not hardcoded light “Aura Gallery.” Pairs Phase 18.

- [x] **AURA-044** · P2 · UX · Contract mobile sign  
  Sticky or early sign affordance so clients aren’t forced past entire legal text with no persistent CTA.

- [x] **AURA-045** · P2 · UX · Sub-album dead end  
  Add back-to-gallery, download (if PIN policy allows), and fix error JSON treated as success.

- [x] **AURA-046** · P2 · UX · Expired gallery  
  Offer studio contact / next step, not only “no longer available.”

- [x] **AURA-047** · P2 · UX · Questionnaire review  
  After submit, allow viewing answers; don’t allow submit with zero questions.

- [x] **AURA-048** · P2 · Copy · Payment / booking emails  
  Fix misleading “secures your date” for non-deposit links; idempotency keys must not use `Date.now()`.

- [x] **AURA-049** · P2 · Security · Draft/expired URL leakage  
  Expired gallery JSON still returns photo URLs; tighten response when status is expired/archived/draft.

- [x] **AURA-050** · P2 · Polish · Success state patterns  
  Unify quote/pay/book/questionnaire success visuals (sparse Aura tone, same layout grammar).

- [x] **AURA-364** · P1 · Reliability · Public zip TTL / partial skips  
  Bulk zip can outlive ~15‑min signed URLs; failed originals silently dropped. Chunk/refresh and report skipped/videos to client (pairs AURA-037).

- [x] **AURA-365** · P2 · Security · Public pay idempotency  
  Stripe Checkout without Idempotency-Key on POST; UI pending helps but server can create duplicates (pairs AURA-150).

---

## Phase 4 — Admin loading, errors, performance

- [x] **AURA-051** · P0 · Bug · Dashboard & Analytics loading  
  `!data` forever on fetch failure; also `setData` without `res.ok`. Distinguish loading / error / empty with retry.

- [x] **AURA-052** · P0 · Performance · `projects/[id]/page.tsx`  
  N+1 sequential `/api/shoots/{id}/wizard` fetches. Batch or include session summaries on project bundle.

- [x] **AURA-053** · P1 · UX · Initial loading states  
  Projects list, Bookings, Payments, Documents, Settings: show loading UI; don’t flash empty then populate.

- [x] **AURA-054** · P1 · UX · Project detail hang  
  Timeout/abort and error state for project load; don’t spin forever.

- [x] **AURA-055** · P1 · Performance · `loadStudioDatabase`  
  Stop loading all photos + all analytics into every admin mutation path; paginate or lazy-load heavy collections. **Blocked:** photos/analytics are used in many RMW paths — do not half-migrate. Revisit after AURA-188 (project-related bundle) or when per-collection reads exist.
  **Done:** `updateStudioDb` skips photos/analytics by default; persist omits unloaded empty heavies (upsert-safe); opt-in `{ photos: true }`; scoped reads (`listPhotosByGalleryId` / `countPhotosByGalleryId` / photo `updateStudioDoc`).

- [x] **AURA-056** · P2 · Bug · Workflow silent subfetch failures  
  `ProjectWorkflowPanel` loadRelated failures look like “no packages/templates.” Surface errors.

- [x] **AURA-057** · P2 · Polish · Unsaved changes  
  Guard Settings / Documents / Packages editors against navigate-away data loss.

- [x] **AURA-367** · P2 · Bug · Projects list null email  
  `projects/page.tsx` filter calls `.email.toLowerCase()` unguarded; walk-in (AURA-131) or bad data will crash list.

---

## Phase 5 — Admin IA, dual model, dead code

- [x] **AURA-058** · P1 · Architecture · API rename cutover  
  Stop calling Projects “clients” in primary UI code paths; introduce `/api/projects` (or fully alias) and remove `data.project || data.client` soup over time.
  **Done:** With W7 / **AURA-273** — `/api/projects` + `/api/sessions`; admin FE cutover; alias delete → **384**.

- [x] **AURA-059** · P1 · Architecture · Dual Firestore collections  
  After migration confidence, stop dual-writing `clients`/`shoots`; single source `projects`/`projectSessions`.
  **Done:** With **AURA-168** / **197** / **273** — no dual-write; legacy flag; ADR.

- [x] **AURA-060** · P1 · Architecture · Dead wizard steps  
  Session tools already quarantine intake/quote (redirect to project). Delete orphan `IntakeStep.tsx` / `QuoteStep.tsx`; confirm no imports (pairs AURA-192).
  **Done:** Verified with **AURA-192** — files absent; no imports remain.

- [x] **AURA-061** · P1 · Architecture · Dead IdeasPanel  
  Either revive Ideas inside Prep properly (FileUploadButton, no raw file input) or delete dead code + `/admin/ideas` confusion.
  **Done:** Deleted unused `IdeasPanel` + `/api/ideas`; `/admin/ideas` → Prep; shot lists remain the hub. `ideaCards` collection kept for existing data.

- [x] **AURA-062** · P1 · Architecture · Packages / shot-lists dual entry  
  Make Prep the only hub; redirect `/admin/packages` and `/admin/shot-lists` (or vice versa — pick one).
  **Done:** Prep `?tab=shots|packages`; legacy routes redirect; Settings Library links updated.

- [x] **AURA-063** · P1 · Architecture · Legacy admin redirects cleanup  
  Clients / shoots / proposals / galleries index redirects: keep aliases but stop nav highlighting weirdness; document canonical URLs.
  **Done:** Server `redirect()` for legacy indexes + detail aliases; Projects nav matches `/admin/projects` + `/admin/shoots*` (helper); `docs/ADMIN_ROUTES.md` + ADR pointer.

- [x] **AURA-064** · P1 · Architecture · Gallery admin index  
  Photographers need a way to find galleries (search/expiry) without knowing the project — Settings “Design” links into Delivery redirect is not enough.
  **Done:** `/admin/galleries` list (search/status/expiry); paginated GET via `listGalleriesForStudio`; More nav; Settings Website → `options=1`.

- [x] **AURA-065** · P1 · UX · Prep vs session Prep naming  
  Rename nav “Prep” library (shot lists + packages) so it doesn’t collide with session prep step.
  **Done:** More nav + `/admin/prep` page titled Library; session wizard step stays Prep; hub copy updated.

- [x] **AURA-066** · P1 · UX · Admin mobile “More”  
  Payments / Documents / pending bookings need faster access (badge counts, smarter More menu, or primary slots).
  **Done:** More drawer = ops-first moreNav only (Payments/Documents top); Bookings pending badge via `view=badges`; desktop badges too.

- [x] **AURA-067** · P1 · UX · Session wizard mobile step jump  
  On 375px, allow jumping among unlocked steps (not only Back/Continue). *(Done with AURA-215 Tabs progress variant.)*

- [x] **AURA-068** · P1 · Architecture · Shoot-day duplication  
  Consolidate `ShootDayStep` and `/admin/shoots/[id]/helper` into one implementation (wake lock / localStorage / mark complete parity).
  **Done:** Shared `SessionShootDay` (wake lock, optimistic saves, mark complete, filter prefs in localStorage); wizard + helper thin wrappers.

- [x] **AURA-069** · P2 · Architecture · Documents mega-page  
  Split contracts vs questionnaires vs templates; stop shared `projectId` silently coupling two forms.
  **Done:** Tabs `contracts` / `questionnaires` / `templates`; separate `contractProjectId` + `questionnaireProjectId`; Settings Library links updated.

- [x] **AURA-070** · P2 · Architecture · Settings mega-page
  Stopgap routed sections via **AURA-317** (Studio | Homepage | Notifications | Integrations | Watermarks). Full Settings IA continues in Phase 20.

- [x] **AURA-071** · P2 · Workflow · Duplicate document/payment entry points  
  Decide canonical: project workflow for happy path; hubs for templates/setup only — remove redundant send UIs or deep-link them.
  **Done:** Documents/Payments hubs = inventory + templates; send only from project workflow; deep-links to projects.

- [x] **AURA-072** · P2 · Terminology · Type systems  
  Unify project type vs session type vs shot-list “shoot type” vs booking session type labeling.
  **Done:** Copy-only labels — Project type / Session label / Applies to / Session type (booking); `type-systems.ts` map; archive zip “Session label”.

---

## Phase 6 — Delivery, galleries, wrap polish

- [x] **AURA-073** · P1 · Workflow · Delivery missing controls  
  Expiry extend/expire and select-limit management in Delivery (not read-only on Wrap).

- [x] **AURA-366** · P0 · Reliability · Admin gallery archive egress  
  Wrap “Archive & download zip” builds JSZip on App Hosting (buffers originals) — violates W1 R2 economics. Move to signed URLs + client zip or R2-side archive before W6 polish.

- [x] **AURA-074** · P1 · Workflow · Email / share gallery from Delivery  
  Surface gallery live email / copy link where photographers expect it (prefs already exist).

- [x] **AURA-075** · P1 · UX · Delivery photo delete/select touch  
  Delete not hover-only; select targets ≥44px.

- [x] **AURA-076** · P1 · Workflow · Create gallery PIN visibility  
  Workflow “Create gallery” generates a random PIN then navigates away without showing it — show and allow copy.

- [x] **AURA-077** · P1 · Incomplete · Video pipeline  
  Real posters/duration; don’t fake 1920×1080; clarify download support.

- [x] **AURA-078** · P1 · Reliability · Sharp missing fallback  
  Don’t silently serve unprotected “watermarked” originals when Sharp fails — fail upload or clearly mark.

- [x] **AURA-079** · P2 · UX · Prep refresh plan confirm  
  Confirm before force-refresh wipes checked shoot-day progress.

- [x] **AURA-080** · P2 · UX · Dashboard archive flags  
  API returns archiveFlags — render expiring/expired work with admin links (not only public `/g/`).

- [x] **AURA-081** · P2 · UX · Dashboard awaiting quotes  
  Link into project workflow actions, not only public `/p/` preview.

---

## Phase 7 — Design system, responsive, copy

- [x] **AURA-082** · P1 · UI · Replace raw checkboxes/selects  
  Projects archived toggle, Settings homepage/notifications, ListEditor, ShootDay filters → `Checkbox` / `Switch` / `Select`.
  **Done:** Verified with AURA-274 — admin surfaces use Checkbox/Switch/Select; ShootDay/helper toggles on Checkbox.

- [x] **AURA-083** · P1 · UI · Ad-hoc buttons  
  `ShootPublicLinks`, helper Exit link, calendar mode toggles, GalleryHero CTA, cover-none CTA → `Button` / shared primitives.
  **Done:** With AURA-274 — ShootPublicLinks/ButtonLink; helper Exit + ShootDay helper link; GalleryHero PublicCta; helper/ShootDay preview controls → Button/Checkbox.

- [x] **AURA-084** · P1 · UI · Card overuse  
  Analytics, workflow step chrome, payments lists — prefer divider lists / composition; cards only when interaction needs a container.
  **Done:** Analytics + payments → `List`/`ListRow` (photo tiles keep `Panel` interactive); workflow outer Card + per-step boxes → section + divide-y.

- [x] **AURA-085** · P1 · Copy · Infra leakage  
  Remove Firebase / Resend / Stripe product narration from user-facing strings (login errors, settings notifications, payments).
  **Done:** With AURA-278 — login/auth/connect/stripeErrorMessage sanitized.

- [x] **AURA-086** · P1 · Copy · Client / Shoot terminology  
  Dashboard, analytics filter, helper, shot lists, notification prefs — Project / Session only in studio admin UI.
  **Done:** With AURA-278 — dashboard/analytics/helper/shot lists/workflow/documents labels.

- [x] **AURA-087** · P1 · Responsive · Settings address grid  
  City/state/ZIP must stack on 375px (not `grid-cols-3` crushed).

- [x] **AURA-088** · P1 · Responsive · Documents / workflow button stacks  
  Reduce vertical button spam on project workflow steps at 375px (menus / primary+overflow).  
  **Done:** `ActionStack` primitive — primary + More below `sm`, full stack from `sm`. Wired questionnaire/pricing/contract/deposit/delivery (+ balance) in `ProjectWorkflowPanel`; Delivery header Share overflow.

- [x] **AURA-089** · P1 · Responsive · Calendar density  
  Month chips/labels usable at 375px; add scroll affordance where horizontal scroll remains.  
  **Done:** Below `md`, month/3-month use compact number+dot grid (tap → day) + agenda day-list; chip grid from `md`. Week day-list unchanged. No H-scroll rails left.

- [x] **AURA-090** · P1 · UX · Time zone input  
  Replace free-text timezone with a validated picker / common IANA list.

- [x] **AURA-091** · P1 · UX · Cover logo URL field  
  Use `FileUploadButton` + upload session like studio logo — not raw URL typing.

- [x] **AURA-092** · P2 · A11y · Dialog / lightbox  
  Focus trap, Escape, initial focus for `Dialog` and `PhotoLightbox`.
  **Done:** Trap honors autofocus / skip-initial close; Dialog `aria-labelledby` + Escape stopPropagation; lightbox keeps Close as initial focus.

- [x] **AURA-093** · P2 · UI · Analytics human labels  
  Event type keys and “Filter by shoot” → Session; show project names, not id slices.
  **Done:** `analyticsEventLabel`; session filter = project · label · date; recent events show project name.

- [x] **AURA-094** · P2 · Copy · Sparse headers  
  Shorten Bookings / Prep / Projects PageHeader essays to label-first Aura tone.
  **Done:** Bookings header description removed; Library/Projects already title-only; projects empty essay dropped.

- [x] **AURA-095** · P2 · Design system · ListEditor  
  Use design-system controls throughout intake/questionnaire editors.
  **Done:** Raw selects → `Select`; row chrome → `Panel`; Field/Label on intake/pricing/partners/shots.

- [x] **AURA-096** · P2 · Responsive · Admin chrome  
  Revisit sticky header + bottom tabs viewport tax; consider icons on bottom tabs.
  **Done:** Icon+label tabs; drop duplicate hamburger; slimmer header; `--admin-tab-bar` clearances.

- [x] **AURA-097** · P3 · Polish · NotificationBell  
  Stronger unread affordance; mark-read UX consistency.
  **Done:** Count badge; unread accent bar/dot; optimistic mark-all; Escape/outside dismiss.

- [x] **AURA-098** · P3 · Polish · Homepage preview in Settings  
  Preview should reflect chosen theme/layout, not a fake wireframe.

---

## Phase 8 — Deletes, cascade, rename edge cases

- [x] **AURA-099** · P1 · Reliability · Delete cascades vs RMW races  
  After AURA-002, ensure session/project delete cannot resurrect via stale full writes; include Google event cleanup.
  **Done:** `deletedDocs` tombstones skip upserts; cascade drops trailing RMW; Google cleanup inside `deleteShootCascade`.

- [x] **AURA-100** · P2 · Bug · Delete session leaves booking orphans  
  Clearing `sessionId` while leaving `pending` bookings — reconcile status.
  **Done:** Linked pending/confirmed bookings → `canceled` + “Session deleted”; clear `sessionId`.

- [x] **AURA-101** · P2 · Bug · Unarchive project  
  Don’t force every archived session to `booked` blindly.
  **Done:** Unarchive restores project stage only; sessions stay archived; confirm copy updated.

- [x] **AURA-102** · P2 · Workflow · Project rename cascade  
  Update custom titles when user opts in, or document that only auto titles update.
  **Done:** Auto cascade (+ Balance); opt-in `renameTitles: all` + project edit checkbox; helper copy.

- [x] **AURA-103** · P1 · Workflow · Archive vs delete messaging  
  Archive shouldn’t leave photographers unsure about live public links; delete should warn about irreversible gallery loss (export reminder).  
  **Done:** `destructive-confirm` — project archive notes links stay live; gallery archive notes link stops; delete project/session remind Wrap zip export.

---

## Phase 9 — Auth, media, rate limits, ops

- [x] **AURA-104** · P1 · Security · Middleware cookie check  
  Validate session token (or move gate entirely to layout with no false admin chrome).  
  **Done:** Signed `token.exp.sig` cookie (Web Crypto HMAC); middleware verifies + drops invalid/legacy; layout `requireAdmin` remains authoritative; optional `AURA_SESSION_SECRET`.

- [x] **AURA-105** · P1 · Security · `requireAdmin` membership  
  Re-check `studioMembers` on each request so revoked users stop immediately.  
  **Done:** `requireAdmin` loads `getMemberByUid` and requires `member.studioId === session.studioId` before studio access.

- [x] **AURA-106** · P2 · Security · Media proxy  
  Decide product: secrecy-of-URL vs signed/expiring URLs for derivatives; document PIN = download-only.  
  **Done:** Decision = signed/expiring R2 (browse 6h, proxy 1h, originals 15m). PIN = download-only. Documented in `CLOUDFLARE_R2.md` + `PUBLIC_ROUTES.md`. Proxy re-mint → **AURA-386**.

- [x] **AURA-107** · P2 · Security · Rate limit  
  Move PIN/download rate limits to a shared store (not per-instance memory).  
  **Done:** `rateLimitShared` → Firestore `rateLimits` (txn); download + homepage password use it; memory fallback. Other routes keep in-process `rateLimit`.

- [x] **AURA-108** · P2 · Security · Homepage / comments spam  
  CAPTCHA or tighter limits on public comments/favorites writes (especially while analytics/writes are expensive).  
  **Done:** No CAPTCHA — honeypot + time-trap on comments; `rateLimitShared` + tighter caps on comments/favorites/contact/photo-view; comment length sanitize.

- [x] **AURA-109** · P2 · Security · Google refresh tokens  
  Encrypt tokens at rest (types already hint at this).  
  **Done:** AES-256-GCM `enc:v1:` via `google-token-crypto`; seal on OAuth callback; open + lazy upgrade on GCal use; optional `GOOGLE_TOKEN_SECRET`.

- [x] **AURA-110** · P1 · Reliability · Auth sessions cleanup  
  Delete expired Firestore auth sessions; clarify Firebase client vs Aura cookie logout.  
  **Done:** `deleteExpiredAuthSessions`; purge on get/list/login + cron; `clientLogout` = cookie/row + Firebase Auth; API logout cookie-only documented.

- [x] **AURA-386** · P2 · Security · Media proxy re-mint
  `/api/media` re-signs derivatives if object path is known (no gallery token). Harden (token/HMAC bind) or retire public proxy once all clients use gallery-minted browse URLs.
  **Done:** HMAC `exp`+`sig` required; path-only 403; remint on gallery/wizard/studio/analytics/book GET; client no longer invents unsigned proxy paths.

- [x] **AURA-387** · P2 · Performance · Watermark reprocess job
  Move gallery/preset rewatermark off request-path `updateStudioDb` (no image I/O under full-studio lock). Enqueue + worker; patch photo docs only. Pairs **AURA-113**.
  **Done:** `watermarkJobs` queue + `drainWatermarkJobs` in maintenance cron; gallery/preset/reprocess enqueue; photo `patchStudioDoc` only; sliced resume cursor.

- [x] **AURA-111** · P2 · Performance · `findStudioBySlug`  
  Index slug → studioId instead of scanning all studios on book/homepage.

- [x] **AURA-112** · P2 · Incomplete · Background jobs
  Watermark reprocess, analytics compaction, gallery expiry, email retries should not all be request-path RMW.  
  **Done:** `runMaintenanceJobs` cron — email outbox + auth purge + `expireDueGalleries` via `patchStudioDoc` (index status+expiresAt). Email already outbox (313). Watermark jobs → **AURA-387**; analytics → **117**.

- [x] **AURA-113** · P2 · Bug · Upload/rewatermark non-jpg assumptions
  Derivative paths and rewatermark must handle png/webp/bin fallbacks.  
  **Done:** `storage-paths` helper (any ext + raw twins); rewatermark tries webp then same-ext; delete/archive clean both.

- [x] **AURA-114** · P2 · Bug · Shoot PATCH  
  Support `endsAt` updates so calendar duration stays accurate. *(Shipped in AURA-152/026; POST also defaults endsAt.)*

---

## Phase 10 — Analytics product, state machines, scale

- [x] **AURA-115** · P1 · Incomplete · Analytics funnel events
  Record `booking_submitted`, `contract_signed` (and fix `sessionId`/`projectId` on events) — money still from transactions.  
  **Done:** `booking_submitted` + `contract_signed` via `recordEvent`; quote view/accept carry `sessionId`+`projectId`. Money still from txs.

- [x] **AURA-116** · P2 · Bug · Analytics attribution
  Gallery events should use `sessionId` after migration, not only deprecated `shootId`.  
  **Done:** `linkedSessionId` + `recordEvent` persists `sessionId` only; normalize promotes legacy `shootId`; gallery single-doc reads coerce; create gallery posts `sessionId`.

- [x] **AURA-369** · P2 · Bug · Google Calendar scope  
  Hardcodes `primary` calendar for freeBusy + CRUD; `dateTime` omits `timeZone` (DST risk). Multi-calendar / local time when studios need it (W0/W3 debt).
  **Done:** `googleCalendarId` + Settings picker; event start/end use studio IANA zone; freeBusy/CRUD target selected calendar.

- [x] **AURA-117** · P2 · Reliability · Analytics retention  
  Bound/compacts `analyticsEvents` growth.  
  **Done:** Cron `compactAnalyticsEvents` — delete by age (default 180d) + rotating per-studio soft cap (default 8k); tombstoned deletes; index `studioId+at`.

- [x] **AURA-118** · P2 · Workflow · Triple state machines  
  Document and sync `project.stage`, `session.status`, `workflowStep` — reduce contradictory badges.
  **Done:** Covered by AURA-173 + AURA-277 helpers; UI badges use readiness (018), not bare stage vs step conflict.

- [x] **AURA-119** · P2 · Bug · Payment advances workflow to prep  
  Don’t jump past unfinished questionnaire/contract when recording payment.
  **Done:** With AURA-277 — `workflowStepAfterDepositPaid` only advances deposit→prep.

- [x] **AURA-120** · P2 · Bug · Contract sign forces deposit step  
  Don’t regress workflow if already paid / further along.
  **Done:** With AURA-277 — `workflowStepAfterContractSigned` skips patch when already at deposit+.

- [x] **AURA-121** · P2 · Incomplete · Team roles  
  Single-owner product decision via AURA-346 — no multi-role / invite UI.

- [!] **AURA-122** · P2 · Incomplete · Selects workflow  
Superseded by **AURA-248** (X of Y + submit + Wrap review).

- [x] **AURA-123** · P3 · Incomplete · Currency  
  USD-only declared in Settings → Payments (`DEFAULT_PAYMENT_CURRENCY`); multi-currency deferred.
- [x] **AURA-124** · P3 · Polish · Command palette / jump-to-project
  Scale aid once project counts grow.  
  **Done:** Admin `Jump` + ⌘/Ctrl+K palette; pages + `/api/projects?options=1`; arrow/Enter; workflow deep link.
- [x] **AURA-125** · P3 · TechDebt · Dead stubs
  Remove or implement `firestore-store` stubs, unused Countdown divergence, unused hashPassword paths, empty `firestore.indexes.json` when needed.  
  **Done:** Deleted unused `firestore-store` + `Countdown.tsx`; removed unused `hashPassword`; indexes already present (galleries expiry + analytics).
- [x] **AURA-126** · P3 · TechDebt · ADR  
  Write a short architecture note: target persistence model (per-entity writes), so agents stop extending the document-document antipattern.
  **Done:** With **AURA-280** — persistence section in `ADR-dual-model-retirement.md`.

---

## Phase 11 — Remaining UX debt (explicit, still in scope)

- [x] **AURA-127** · P1 · UX · Project header destructive actions
  Separate Archive/Delete from primary nav actions; reduce mis-tap on mobile.  
  **Done:** Project header `ActionStack` — All projects primary; Archive/Delete always under More (`menuIds`).

- [x] **AURA-128** · P1 · UX · Quote/session required path
  When Pricing needs a session, CTA to create session inline — don’t bury “New session” below the fold.  
  **Done:** Pricing step shows inline Add session (label + date) when none exist; then package/quote UI.

- [x] **AURA-129** · P1 · UX · Multi-session workflow status  
  Prep/delivery badges must consider all sessions or the selected session explicitly.  
  **Done:** Aggregate prep/delivery across open sessions (`session-readiness`); badges show `1 of N` / `Done · N`; workflow API aligned.

- [x] **AURA-130** · P2 · UX · Projects list stages  
  Humanize stage labels; optional filter by stage/workflow.  
  **Done:** List shows stage badge + workflow step label; Stage/Workflow selects; API `stage` + `workflowStep` filters.

- [x] **AURA-131** · P2 · UX · Walk-in projects  
  Allow projects without email (or defer email until send) for phone-only inquiries.  
  **Done:** Empty email on create/edit; send paths require email (`PROJECT_EMAIL_REQUIRED`); questionnaire still creates + copies link.

- [x] **AURA-132** · P2 · UX · Bookings empty/loading duplication  
  Fix double empty messages and confirm/decline reopen flows.  
  **Done:** Loading EmptyState before empty flash; single pending/history empty pattern; PATCH 409 if not pending; optimistic status + dialog mutual exclusion.

- [x] **AURA-133** · P2 · UX · Documents contract preview  
  Preview public `/c/` rendering before send.  
  **Done:** Shared `ContractPublicView`; template Preview page; workflow draft→`/c/` preview; send promotes draft; drafts excluded from sent/client links.

- [x] **AURA-134** · P2 · UX · Payments open-link limits  
  Expose min/max for customer-chooses mode instead of silent 25–500.  
  **Done:** Edit dialog Min/Max fields; `parseOpenLinkLimits` (default 1–500); pay page shows range; API validates.

- [x] **AURA-135** · P2 · UX · Packages $0 defaults  
  Don’t seed sendable $0 tiers without friction.  
  **Done:** New packages start with empty pricing; API strips all-$0 seeds; create/send confirm on $0; empty package blocked.

- [x] **AURA-136** · P2 · Copy · Toast infra voice  
  “Email skipped” / “Quote marked; email skipped” → sparse product language.  
  **Done:** `toastAfterEmailAttempt` → Quote/Pay/Gallery “ready”; payments “Couldn't email”.

- [x] **AURA-137** · P2 · UX · Cancel link placement  
  Keep cancel link available but out of the primary workflow chrome competition.  
  **Done:** Removed from workflow header; Copy cancel link under project More (with Archive/Delete).

- [x] **AURA-138** · P2 · Design · ShootDay preview modal  
  Use shared `Dialog`, not a one-off fixed overlay.  
  **Done:** Already Dialog via AURA-212; verified `SessionShootDay`; dropped redundant Close button.

- [x] **AURA-139** · P2 · Copy · Helper / shoot language  
  “Photoshoot helper”, “No plan for this shoot”, “Nice work…” → Session tone, sparse copy.  
  **Done:** Session day labels; sparse “No plan yet.” / “Must-haves done”; Start plan; Plan the session handoff.

- [x] **AURA-140** · P3 · UX · Login control consistency  
  Mode toggle uses design-system patterns.  
  **Done:** Sign in / Create studio via `SegmentedControl`; removed underline mode buttons.

- [x] **AURA-141** · P3 · Polish · Bottom tab labels  
  Icon + text for primary destinations.  
  **Done:** Readable `text-xs` labels; Home/Projects/Bookings/More; taller `--admin-tab-bar`.

- [x] **AURA-142** · P3 · Polish · Analytics date range / export  
  Beyond fixed 14-day activity slices.  
  **Done:** `days` API filter (7/14/30/90/all); SegmentedControl range; Export CSV (activity + revenue + totals).

- [x] **AURA-143** · P3 · A11y · Gallery image labels
  Consider non-empty alts or figcaptions where filenames exist.

- [x] **AURA-144** · P3 · Polish · Email template theming
  Optional alignment with studio dark themes (or keep linen deliberately — decide).

- [x] **AURA-145** · P3 · Workflow · Reschedule
  Client-facing reschedule beyond cancel-only (product decision).
  **Done:** Request-only (not self-serve slots): `/cancel` → Change or cancel; preferred time + note → studio notify/email; session unchanged until studio edits.

- [x] **AURA-146** · P3 · Bug · Booking received email prefs  
  Apply `clientEmailAllowed("booking")` to request-received as well as confirmed.

- [x] **AURA-147** · P3 · Polish · Gallery footer logo
  Show studio logo when available on public gallery footer.

- [x] **AURA-148** · P3 · UX · Download favorites discoverability
  Entry from hub chrome, not only inside favorites view.

- [x] **AURA-149** · P2 · Reliability · Email outbox
  Durable retry for Resend failures (replace deleted `emailJobs` with something real).
  **Done:** `transactional` outbox jobs store payload; `emailClient({ studioId })` enqueues on Resend fail; contact path keeps `skipOutbox` + 313 rebuild.

- [x] **AURA-150** · P2 · Security · Public pay double Checkout  
  Disable submit while redirecting; prevent duplicate sessions.
  **Done:** submitLock + redirecting lock; fields/button disabled; POST rate limit (pairs 365 Idempotency-Key).

---

## Phase 12 — BE/FE unification (one language end-to-end)

Goal: **Project / Session / Quote** everywhere — APIs, Firestore, types, UI — with dual Client/Shoot/Proposal retired. Performance: drop dual-writes and N+1 wizard loads.

### U0 — Field truth & dual-write dampening

- [!] **AURA-151** · P0 · DataModel · Project field round-trip  
**Superseded by AURA-001** (includes regression check). Do not implement separately.

- [x] **AURA-152** · P0 · DataModel · Session field round-trip  
  Hardened `coerceSession` (wizard flags / intakeAnswers); PATCH `/api/shoots/[id]` now accepts `endsAt`, `proposalId`, `galleryId`, `googleEventId`, `intakeAnswers`. `sessionRoundTripPreserved()` helper. **W0: after AURA-001.**
- [x] **AURA-153** · P0 · Reliability · Dual-collection merge rules  
  Document and harden: `projects`/`projectSessions` win; legacy `clients`/`shoots` fill gaps only. Prevent resurrect-on-persist after delete. Tests for cascade delete.
- [x] **AURA-154** · P0 · Performance · Dual-write dampening  
  Until per-doc writes (AURA-002): do not dual-write `clients`/`shoots` on analytics/photo hot paths; or feature-flag dual-write off for append-only mutations. Every RMW today rewrites four entity collections for projects/sessions alone. *(Per-doc writes landed in 002/003; dual-write remains only on full `persistStudioDatabase` — append/patch/updateStudioDoc and `appendStudioPhotos` bypass it. Documented.)*

### U1 — Canonical APIs

- [x] **AURA-155** · P1 · API · `/api/projects` (+ `[id]`)  
  CRUD with `{ project, sessions }` only. Keep `/api/clients` as thin alias one release. **Perf:** project detail must not require N wizard calls.

- [x] **AURA-156** · P1 · API · `/api/sessions` (+ `[id]`, plan, wizard)  
  POST: `projectId` + `startsAt` (normalize/deprecate `clientId`/`shootDate`).

- [x] **AURA-157** · P1 · API · Quotes naming  
  Standardize API noun **quote** (`/api/quotes` alias or docs); responses use `sessionId` not `shootId`. Collection may remain `proposals` until optional rename.

- [x] **AURA-158** · P1 · API · Gallery create accepts `sessionId`  
  Stop requiring `shootId` / “Shoot not found” errors.

- [x] **AURA-159** · P1 · API · Bundle helpers rename  
  `getProjectBundle` / `getSessionBundle` — drop parallel `client`/`shoot` keys after FE cutover.

- [x] **AURA-160** · P1 · API · Wizard payload canonical keys  
  Return `project`/`session` only.

- [x] **AURA-161** · P1 · Performance · Project session summaries  
  `GET /api/projects/[id]?include=sessionSummaries` (tokens, step, photoCount) — replaces N+1 `/api/shoots/{id}/wizard` (AURA-052).

### U2 — FE cutover (no `||` soup)

- [x] **AURA-162** · P1 · FE · Projects list/detail → `/api/projects`  
  Remove `data.project || data.client` / `shoots || sessions`.

- [x] **AURA-163** · P1 · FE · Session tools → `/api/sessions`  
  Types `ProjectSession`; drop deprecated shell props.

- [x] **AURA-164** · P1 · FE · Workflow / Payments / Documents / Analytics pickers  
  Use projects/sessions endpoints; analytics filter `sessionId`.

- [x] **AURA-165** · P1 · FE · Ban dualism patterns in app code  
  No `project||client`, `session||shoot`, `sessionId||shootId`, `startsAt||shootDate` outside `normalize`.

- [x] **AURA-166** · P1 · Public API · `clientName` → `projectName`  
  Dual-read briefly; remove `clientName` from JSON (UI copy may still say the person’s name).

### U3 — Drop dual Firestore collections

- [x] **AURA-167** · P1 · Persistence · Read path projects/sessions only  
  **Perf:** fewer collection scans per `loadStudioDatabase`.

- [x] **AURA-168** · P1 · Persistence · Write path single source  
  Remove dual-write + alias sync; one-shot cleanup of leftover `clients`/`shoots` docs.

- [x] **AURA-169** · P1 · Persistence · Stop mirroring deprecated fields  
  Stop writing `shootId` when `sessionId` set (proposals, galleries, plans, analytics).

- [x] **AURA-170** · P2 · Types · Remove deprecated aliases  
  Delete `Client`/`Shoot` extras; rename status/plan types to Session*.

- [x] **AURA-171** · P2 · Naming · Auth `sessions` vs product sessions  
  Clarify/rename auth cookie collection vs `projectSessions` in ADR.

### U4 — Server-owned workflow state

- [x] **AURA-172** · P1 · Workflow · `GET /api/projects/[id]/workflow`  
  Server-computed step readiness — UI stops inventing `depositPaid` / badge heuristics.

- [x] **AURA-173** · P1 · Workflow · Triple state sync rules  
  Codify `project.stage` ↔ `workflowStep` ↔ `session.status` (incl. gallery go-live side effects).

- [x] **AURA-174** · P1 · Data · Cancel token on all project creates  
  Manual `/api/projects` create gets `cancelToken` (not only booking form).

- [x] **AURA-175** · P1 · Data · Intake answers single home  
  One write/read path across questionnaire vs quote intake vs session.

- [x] **AURA-176** · P1 · FE · Helper localStorage divergence  
  Server is source of truth for plans; remove or strictly draft-sync local cache.

- [x] **AURA-177** · P1 · FE · Fake “intake done”  
  Stop treating nonempty `session.type` as intake complete.

- [x] **AURA-178** · P2 · FE · SessionRow DTO from summaries  
  No client remapping `startsAt`→`shootDate` after N+1.

- [x] **AURA-179** · P2 · Backend fields UI must use  
  Wire `archiveFlags`, clarify `projectDate` vs `startsAt` for sorting.

### U5 — Shared validation

- [x] **AURA-180** · P1 · Validation · Shared schemas (zod or equivalent)  
  Project/Session/Gallery/Quote create-update — one source for FE+BE.

- [x] **AURA-181** · P1 · Validation · Email required only on send  
  Walk-in projects allowed; email required on email endpoints.

- [x] **AURA-182** · P1 · Validation · Datetime ISO + studio TZ  
  Normalize date-only → ISO; reject ambiguous shapes after FE update.

- [x] **AURA-183** · P1 · Validation · PIN parity  
  Same 4-digit rule on all gallery create UIs + server.

- [x] **AURA-184** · P1 · Validation · Quote/session coupling  
  Explicit: session-required XOR project-draft quotes; errors say Session not Shoot.

- [x] **AURA-185** · P2 · Validation · Quote replace explicit  
  `replace: true` required to wipe prior quotes for a session.

### U6 — Terminology & missing APIs

- [x] **AURA-186** · P1 · Terminology · API errors + admin strings  
  No “Shoot not found” / clientId in product UI.

- [x] **AURA-187** · P1 · Terminology · Type systems map  
  Unify project type, session type, shot-list type, booking session type.

- [x] **AURA-188** · P1 · Performance · `GET /api/projects/[id]/related`  
  Quotes, contracts, questionnaires, payment links, invoices for one project — stop studio-wide list+filter.

- [!] **AURA-189** · P1 · Performance · Batch session summaries  
Same as AURA-161; no full photo arrays for cards. *(Superseded — keep 161 only.)*

- [x] **AURA-190** · P1 · API · Session `endsAt` on PATCH  
  Calendar duration stays accurate. *(Shipped in AURA-152/026.)*
- [x] **AURA-191** · P2 · Performance · Quotes `?projectId=`  
  Don’t ship full studio graph for workflow panel.
- [x] **AURA-192** · P2 · Dead dual entry cleanup  
  Quarantine unused Intake/Quote steps; convert→gallery lands on Delivery.
- [x] **AURA-193** · P2 · Legacy URL matrix  
  Canonical `/admin/projects/.../sessions/...`; update dashboard helperHref.
- [x] **AURA-194** · P2 · Docs · Public route noun map  
  `/p` quote, `/q` questionnaire, `/c` contract, `/g` gallery, `/pay`, `/book`, `/cancel`, `/h` homepage.

### U7 — Analytics field cutover

- [x] **AURA-195** · P1 · Analytics · `recordEvent` schema  
  Write `sessionId`+`projectId`; depends on AURA-003 append-only.

- [x] **AURA-196** · P2 · Analytics · Filter API  
  `sessionId`/`projectId` params; join money correctly.

### U8 — Hard cutover

- [x] **AURA-197** · P1 · Cutover · Deprecate aliases  
  Deprecation headers → 410/redirect-only; remove legacy from `TENANT_COLLECTIONS`. *(clients/shoots removed from TENANT_COLLECTIONS; legacy collections still readable for backfill/delete cascades. API aliases /api/clients and /api/shoots remain for one release.)*

- [x] **AURA-198** · P2 · ADR · Dual-model retirement  
  Canonical names, collection map, forbidden aliases, per-entity persist.

- [x] **AURA-199** · P2 · Tests · Unification contracts  
  Bundle shapes, normalize field preservation, delete cascades, no dual-write when flag off.

- [x] **AURA-384** · P2 · Cutover · Remove `/api/clients` + `/api/shoots`  
  After AURA-273 admin FE cutover: delete alias routes (or 410); keep `AURA_LEGACY_COLLECTIONS` for Firestore backfill only. **W14.**
  **Done:** plan/wizard/wrap live under `/api/sessions`; clients/shoots → 410 + successor Link; legacy Firestore flag unchanged.

- [x] **AURA-200** · P3 · Decision · Rename collection `proposals` → `quotes`  
  Only after API stable; prefer noun “quote” with collection `proposals` if migration costly.
  **Done:** Keep Firestore `proposals`; product/API noun remains Quote (`/api/quotes`). No dual-read migration — cost > benefit (ADR updated).

- [x] **AURA-370** · P2 · UX · Pretty admin URLs  
  `/admin/projects/{id}/sessions/{id}?step=prep` uses opaque ids — offer slugs or short ids (e.g. `/admin/projects/wedding-smith/sessions/engagement`) while keeping id deep-links working. **Studio slug in admin path is optional** — duplicate studio names are allowed; prefer no studio segment (current) or session-first URLs (`/admin/sessions/{id}`) over `/admin/{studioSlug}/…`. After AURA-197 cutover.
  **Done:** `adminSlug` on project/session; resolve id|slug; `/admin/sessions/{ref}` entry; canonicalize to pretty path; id deep-links kept.

---

## Phase 21 — Web / PWA comprehensive audit residuals (2026-07-31)

Full report + Before/After notes: [`docs/WEB_PWA_AUDIT.md`](WEB_PWA_AUDIT.md).  
Do **not** reopen closed Phase 18 PWA IDs — these are residual gaps found against the audit engine.

### W15 — Critical / ship security & PWA install

- [x] **AURA-388** · P0 · PWA · Static icons for SW precache  
  Commit `public/icon-192.png` + `public/icon-512.png` (AURA-289 claimed done but only `icon-512-maskable.png` exists). `sw.js` PRECACHE + fallback manifests 404 → SW install can fail entirely.
  **Done:** Regenerated via `npm run icons` (192/512/maskable present + git-tracked); SW v6 per-URL precache so one miss cannot abort install.

- [x] **AURA-389** · P0 · Security · HMAC secrets fail-closed  
  Production must not fall back to `NEXT_PUBLIC_APP_URL` / `"aura-session"` / `"aura-media-proxy"` for session, media-proxy, homepage-unlock, Google token seal. Require App Hosting secrets; 503 if unset.
  **Done:** `crypto-secrets.ts` fail-closed in prod; wired session/media/homepage/Google seal; `AURA_SESSION_SECRET` in `apphosting.yaml`; mint paths 503.

- [x] **AURA-395** · P0 · Performance · Gallery photo server paging  
  Public gallery GET must not `listPhotosByGalleryId` then slice — Firestore limit/offset or cursor. Bounds memory for large galleries.
  **Done:** `listPhotosByGalleryIdPage` (orderBy sortOrder + offset/limit + count agg); public GET + cover ids via `getPhotosByIds`; photos composite index.

- [x] **AURA-396** · P0 · Performance · Photo count without full load  
  `countPhotosByGalleryId` must not materialize all docs; aggregation or cheap count. Fixes N× scans on project detail.
  **Done:** Firestore `.count()` aggregation; optional `kind` filter; `galleryId+kind` index.

### W15 — High security / PWA / offline / hot paths

- [x] **AURA-390** · P1 · Security · CSP + security headers  
  `Content-Security-Policy` (report→enforce), `frame-ancestors`/`X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS in prod (`next.config` / middleware / hosting).
  **Done:** `security-headers.ts` via `next.config` headers; Report-Only CSP + `/api/csp-report`; `AURA_CSP_ENFORCE=1` to enforce; HSTS in prod.

- [x] **AURA-391** · P1 · Security · Google OAuth `state`  
  CSRF-safe authorize + callback verify before storing refresh token.
  **Done:** Signed HttpOnly `aura_gcal_oauth` bound to studioId; authorize `state` nonce; callback verify + clear.

- [x] **AURA-392** · P1 · Security · Shared rate limits on auth + public mutators  
  `rateLimitShared` on login/signup + pay/book/proposal accept/contract sign/cancel/questionnaire (multi-instance safe). Pairs **AURA-107**.
  **Done:** Shared limits on login/signup + pay/book/accept/sign/cancel/questionnaire; tightened pay/accept/sign/questionnaire caps.

- [x] **AURA-393** · P1 · PWA · SW update reload  
  After `SKIP_WAITING`, listen for `controllerchange` and reload once (or “Update available”).
  **Done:** `RegisterSW` arms `controllerchange` reload after first control; updates reload once; first install does not.

- [x] **AURA-394** · P1 · PWA · Offline App Router honesty  
  Do not serve cached HTML that needs uncached `/_next` chunks; prefer `/offline.html` or co-cache critical assets.
  **Done:** SW v7 — stop App Router HTML page cache; offline navigate → `/offline.html` only; purge legacy `aura-pages-*`.

- [x] **AURA-397** · P1 · Performance · Download path scoped photos  
  Public download must not full `readStudioDb` + filter all photos — gallery-scoped list (after **395**).
  **Done:** Download uses `listPhotosByGalleryId` / `getPhotosByIds` only — no studio graph.

- [x] **AURA-399** · P1 · Reliability · Book + workflow offline honesty  
  Public book + `ProjectWorkflowPanel` mutations: `mutateJson` / offline toast; never stuck pending on flaky network.
  **Done:** Book POST + ProjectWorkflowPanel mutations/load via `mutateJson`; `finally` clears pending/busy.

- [x] **AURA-400** · P1 · PWA · Admin icons without auth  
  Manifest/OS icon fetch for admin must not 401 when session cookie cold — static or public mark URL.
  **Done:** Admin manifest uses `studio=` icon query; `surface=admin` fails open to static (no 401).

- [x] **AURA-398** · P1 · Performance · Font strategy  
  Root layout loads six Google fonts on every route — subset + load kit fonts on demand.
  **Done:** Root = Fraunces+Figtree only; kit faces via `EnsureKitFonts` / settings `all-kits`; latin + `display:swap`.

- [x] **AURA-404** · P1 · Bug · Shoot-day optimistic race  
  Notes rollback must not wipe concurrent checkbox toggles (functional updates / version).
  **Done:** Toggle/notes use functional setState; rollbacks touch only the failed field; notes skip rollback if edited further.

- [x] **AURA-407** · P1 · Performance · Book + dashboard light reads  
  `readStudioDb({ photos:false, analytics:false })` or scoped lists on book GET + dashboard.
  **Done:** Book GET uses `listSessionTypesForStudio`; dashboard `readStudioDb({ photos:false, analytics:false })`.

### W15 — Medium / Low residuals

- [x] **AURA-401** · P2 · UX · Route `loading.tsx` / `error.tsx`  
  Admin, `/g`, `/h`, `/book` streaming + recovery shells.
  **Done:** Shared `AdminRouteLoading`/`PublicRouteLoading` + error retry (`refresh`+`reset`); wired under admin, `g/[token]`, `h/[slug]`, `book/[slug]`.

- [x] **AURA-402** · P2 · PWA · Unknown gallery manifest 404  
  Missing gallery token must not emit installable “Aura Gallery” manifest.
  **Done:** Manifest route 404s; layout omits `manifest` / appleWebApp when gallery missing.

- [x] **AURA-403** · P2 · PWA · Per-token install dismiss  
  Gallery InstallHint storage key scoped to token (like homepage slug).
  **Done:** `aura-install-dismiss-g-${token}` (matches homepage / book pattern).

- [x] **AURA-405** · P2 · a11y · NotificationBell focus + rollback  
  Focus trap + Escape; mark-read failure restores unread state.
  **Done:** `useFocusTrap` on panel (Escape + restore); mark-read / mark-all rollback on non-OK / network fail.

- [x] **AURA-406** · P2 · Reliability · Favorites concurrent toggle  
  Firestore txn or atomic union/remove — no lost hearts under double-tap.
  **Done:** `toggleVisitorFavorite` via `runTransaction` (limit + submitted checks inside txn).

- [x] **AURA-408** · P2 · Security · Lock down `/api/status`  
  Admin-only or strip project/R2/host details in production.
  **Done:** Prod unauth → `{ ok, error }` only; full project/R2/host payload for admins (dev keeps detailed for local setup).

- [x] **AURA-409** · P2 · a11y · Muted small-text contrast  
  Audit `--muted` at `text-xs`/`text-[10px]` on canvas; bump token or size.
  **Done:** Root `--muted` `#5a544c`; sand/olive/spring/sage muted darkened to AA; gallery chrome + AlbumNav labels `text-xs`.

- [x] **AURA-410** · P2 · Responsive · `roomy` + builder density at 768  
  Soften bottom↔top chrome flip; designers usable at tablet without horizontal scavenger UI.
  **Done:** `desk` (1024×560) retires thumb chrome; `roomy` keeps hero layout; builders use step tabs / 2-col swatches / wrapped segments until `lg`.

- [x] **AURA-411** · P2 · Performance · Split gallery guest client island  
  Lazy-chunk lightbox/download/comments; pair **401** loading UI.
  **Done:** `lazy-gallery-overlays` chunk (lightbox/PIN/contact/`PhotoCommentPanel`); prefetch after load; `OverlayChunkLoading` + route `loading.tsx`.

- [x] **AURA-412** · P2 · Performance · Gallery thumb dimensions  
  Reserved aspect / `sizes` (reduce CLS); prefer shared image helper over bare `<img>`.
  **Done:** `GalleryThumb` + `galleryThumbSrcSet`/`sizes`; public photos pass width/height; masonry reserves aspect (4:5 fallback).

- [x] **AURA-413** · P3 · Performance · Coalesce photo-view analytics  
  Session-dedupe lightbox opens (fewer RTTs on slow networks).
  **Done:** `recordGalleryPhotoView` — sessionStorage + in-flight dedupe; fire-and-forget on lightbox selected id.

- [x] **AURA-414** · P2 · Security · Client IP trust  
  Prefer platform client IP (`CF-Connecting-IP` / rightmost XFF) for rate limits.
  **Done:** `clientIp` → CF-Connecting-IP, then rightmost XFF, then X-Real-IP; rejects spoofable leftmost.

- [x] **AURA-415** · P3 · Security · Admin Origin allowlist  
  Optional defense-in-depth on cookie-auth mutating APIs (beyond SameSite=Lax).
  **Done:** Middleware Origin/Referer check on admin API mutations; prod default on when APP URL set; `AURA_ADMIN_ORIGINS` extras.

- [x] **AURA-416** · P3 · Privacy · Public quote field allowlist  
  Do not spread full proposal doc to clients.
  **Done:** `toPublicProposal` allowlist on GET/POST; omits studio/project/session ids, token, template id, answers, timestamps.

- [x] **AURA-417** · P3 · a11y · Dialog `inert` background  
  `inert` + `aria-hidden` on `document.body` siblings while Dialog open (`inert-background.ts`).

- [x] **AURA-418** · P3 · PWA · `/q` + `/cancel` theme-color  
  Layouts + manifests via `publicFlowPwaChrome`; `questionnaire`/`cancel` pwa-icon keys; InstallHint; no SW.

---

## Phase 22 — Contact vs booking (intake clarity)

**Problem:** Dashboard **Messages** feels like an inbox / next step after a client Message, but Phase 19 contact is email + notify only. Booking work starts in **Bookings**; project-scoped mail (AURA-371–374) applies after a project exists. Studios get stuck looking for “continue booking” on Messages.

**Product goal:** Bookings = only path that starts work. Public Message stays for reach-out (not a CRM). Project Messages trail stays for locked-in correspondence. No in-app Inbox (roadmap forever-out).

- [x] **AURA-419** · P1 · Product · Demote Dashboard Messages  
  Removed Dashboard Messages list; `contactNotifyHref` → project `#messages` or `/admin`; dead-email issues → Settings; Project trail eyebrow **Project** (not Inbox).

- [x] **AURA-420** · P2 · UX · Bookings as intake clarity  
  Bookings header + empty states: form → confirm → project; project Messages empty clarifies email trail only.

- [x] **AURA-421** · P3 · Product · Contact → start project (optional)  
  Studio-level contact notify / email → New project (`?contact=` prefill); create links `contactMessageId`; project trail after save.

---

## Phase 23 — UI / responsive residuals (W17)

**Problem:** W12 closed systemic 375/PWA gates, but a 2026-07-31 multi-agent pass (plus second pass) found overlay/token drift, admin/public gaps, dishonest builder Phone preview, PWA preview/scope honesty, and hero/`vh` residuals. No P0 layout ship-blockers; do not reopen closed W12 IDs.

**Product goal:** Overlays clear chrome on phone/standalone; admin deep-links and calendar usable one-handed; public gallery coach/PWA honest; builder “375” matches real phone CSS; installed admin previews work.

**Execution (wave order):** Systemic **422–426** → admin **427–431** + **444–448** → public/PWA **432–438** + **449–455** → builders **439–442** → dialogs/tokens **456–458** → polish **443** + **459–460**.

### Systemic chrome & overlays

- [x] **AURA-422** · P1 · Responsive · Bottom-chrome CSS vars + Toast surface offset  
  `--gallery-thumb-bar` + `--chrome-bottom`; `ChromeBottom` html class for Toast; wizard/gallery use vars; drop phantom `4.75rem` on `/q` `/cancel` `/c`.

- [x] **AURA-423** · P1 · UI · `Sheet` primitive  
  `Sheet` portal + scrim + safe-area + focus trap/inert; bottom sheet (rounded top); consumers may gate to phone and keep desktop popover.

- [x] **AURA-424** · P1 · UX · NotificationBell → Sheet  
  Bell opens portaled `Sheet` (scrim, safe-area, focus trap); list scrolls in sheet body.

- [x] **AURA-425** · P1 · UX · ActionStack More portal / flip  
  More opens portaled `Sheet` (all breakpoints) — clears tab bar; closes after action.

- [x] **AURA-426** · P2 · Responsive · Dialog horizontal safe-area  
  Dialog root uses `max(1rem, env(safe-area-inset-*))` on all four sides.

### Admin gaps

- [x] **AURA-427** · P1 · PWA · Admin hash `scroll-mt` vs notch  
  `--admin-scroll-mt` (= `--admin-sticky-top`); admin hash targets use `scroll-mt-[var(--admin-scroll-mt)]`.

- [x] **AURA-428** · P1 · Responsive · Week calendar sessions tappable  
  Phone week day headers → day view; list rows → session helper; month-grid chips stay decorative; desktop week chips link.

- [x] **AURA-429** · P1 · UX · Payments row ActionStack  
  Payment links: Copy primary; Project/Email/Edit secondary; Archive in More (`menuIds`).

- [x] **AURA-430** · P2 · UI · Calendar view → SegmentedControl  
  Day / Week / Month / 3 months via shared `SegmentedControl`.

- [x] **AURA-431** · P2 · Responsive · Admin section Tabs on phone  
  Default `Tabs` with 3+ items: Select jump below `md`, tablist from `md`.

### Public / PWA

- [x] **AURA-432** · P1 · Responsive · Gallery coach vs thumb bar  
  Coach clears thumb bar until `desk:`; InstallHint hidden while coach visible.

- [x] **AURA-433** · P1 · Responsive · AlbumView double top safe-area  
  `stickyHeader={false}` drops notch `pt` (chrome already owns it).

- [x] **AURA-434** · P1 · PWA · Sub-album `/s` under gallery scope  
  Canonical `/g/{gallery}/s/{album}`; legacy `/s/{album}` redirects; links + PUBLIC_ROUTES updated.

- [x] **AURA-435** · P2 · Responsive · Vertical hero padding vs `shell-pad`  
  Vertical cover: `pl` = max(1.5rem/3rem, gutter, safe-area); `pr` keeps shell-pad; no competing `pl-6`.

- [x] **AURA-436** · P2 · UX · Album / favorites action overflow  
  AlbumView `actionItems` → ActionStack (primary + More Sheet on phone); favorites / peek / sub-album wired.

- [x] **AURA-437** · P2 · UI · Quote post-accept + packages unified-ui  
  `ChoiceCard` for packages; post-accept Sign/Pay → `ButtonLink`.

- [x] **AURA-438** · P3 · PWA · InstallHint clearance on `/q` + `/cancel`  
  Done with **422** — `1rem + safe-area` (no phantom gallery `4.75rem`). Broader InstallHint vs CTA → **451**.

### Builders / wizards

- [x] **AURA-439** · P1 · Responsive · DeviceFramePreview viewport honesty
  Phone mode drives layout via `@container-size` + `@sm`/`cqw`/`cqh` (container breakpoints aligned to viewport); mock `--safe-inset-*` in phone frame; cinematic rails `cqw`.

- [x] **AURA-440** · P2 · UX · WebsiteBuilder touch reorder  
  Drag handle `lg+` only (handle is the drag source); Move up/down remain the phone path.

- [x] **AURA-441** · P2 · Responsive · Wizard sticky footer scroll-padding  
  `--wizard-sticky-footer` content spacer; html `scroll-padding-bottom` = footer + tab + safe-area (md: footer only).

- [x] **AURA-442** · P2 · UX · Delivery Layout publish on phone  
  Layout `max-md`: Go live + Checklist sheet + Preview; full ActionStack/checklist remain on Photos and `md+`.

### Polish bundle

- [x] **AURA-443** · P3 · Polish · Module nav copy + Jump + Messages empty  
  GalleryDesignPanel modules → default Tabs (no Step N of M); Jump `labelFrom="sm+"`; Messages empty title-only.

### Second pass — admin / PWA honesty (2026-07-31)

- [x] **AURA-444** · P1 · PWA · Contract draft Preview same-tab  
  Draft + saved template Preview → `router.push` `/admin/documents/contract-preview` (same-tab sessionStorage).

- [x] **AURA-445** · P2 · PWA · Admin previews stay in `/admin` scope  
  `/admin/preview/{c|q|p|g|book}/[id]` iframe shell; documents / booking / ShootPublicLinks / workflow contract Preview same-tab.

- [x] **AURA-446** · P2 · UX · ShootPublicLinks Copy on phone  
  Header density: “Copy link” Sheet below `md`; inline Copy from `md` up.

- [x] **AURA-447** · P2 · Responsive · New session + Brand social stack to `md`  
  New session + Brand social rows stack until `md` (`md:grid-cols-*`).

- [x] **AURA-448** · P2 · UX · Message trail reveal truncated body  
  Truncated summary is tappable (`title` + Dialog with full message).

### Second pass — public / heroes / chrome

- [x] **AURA-449** · P1 · UX · Lightbox footer density  
  Primary Download/Favorite + Comments Sheet; drop max-h crush; short-vh rail `pr` safe-area.

- [x] **AURA-450** · P1 · Responsive · Heroes use `dvh`/`svh` + homepage L/R safe-area  
  GalleryHero → `svh`; homepage `hero-fill-*` (svh+cqh); modules/collections L/R via `shell-pad` / `--safe-inset-*`.

- [x] **AURA-451** · P2 · PWA · InstallHint vs primary CTAs  
  `InstallHintDock` + `--install-hint-clearance` / `.install-hint-pad` on `/book` `/pay` `/h` `/p` `/c`; sticky Sign rides above hint.

- [x] **AURA-452** · P2 · UI · Studio theme vars on `/c` `/pay` `/q` `/cancel`
  Bare `PublicShell` without `studioThemeCssVars` (contrast `/book` `/p` `/h`). Apply kit from flow payload.

- [x] **AURA-453** · P2 · Responsive · Public long titles / contract body wrap  
  `/p` packages, `/pay` title, `/c` title+body: `min-w-0 break-words` / overflow-wrap.

- [x] **AURA-454** · P2 · Responsive · Gallery pad-x + safe-area  
  `--gallery-pad-x` and diary/albums/PrintPartners/GuestState/coverless use bare rem/`px-4` — `max(pad, env(safe-area-inset-*))`.

- [x] **AURA-455** · P2 · Responsive · Public `#photos` scroll-mt  
  `scroll-mt-16` short of sticky GalleryChrome + notch (public cousin of **427**).

### Second pass — dialogs / tokens / polish

- [x] **AURA-456** · P2 · UX · Confirm actions phone-stack  
  Match PinModal: `flex-col-reverse` + full-width below `sm` (not side-by-side wrap only).

- [x] **AURA-457** · P2 · UX · Dialog + iOS keyboard  
  `visualViewport` / resize so bottom-sheet Dialog + inputs (command palette, Pin, comments) stay reachable.

- [x] **AURA-458** · P2 · UI · ThemeSwatch on-media tokens  
  Replace `#faf8f5` / raw `rgba` scrims with on-media / scrim tokens.

- [x] **AURA-459** · P3 · UX · Public `loading`/`error` coverage  
  Add shells for `/p` `/c` `/pay` `/s` `/q` `/cancel` / peek; client soft errors → EmptyState.

- [x] **AURA-460** · P3 · Polish · Delivery Tabs + print + focus rings + peek hint  
  Delivery Photos/Layout → shared `Tabs`; `@media print` hide sticky Sign; Dialog/Masonry focus-ring clip; peek InstallHint; contact email `break-all`; Jump/palette `title` on truncate.

---

## Phase 24 — Post-W17 residual audit (W18)

**Problem:** Declaring W17 “complete” without a third pass left ship-visible defects (Checkbox label overlap from AURA-375 hit padding; InstallHint gaps; admin Preview still leaving PWA scope).  
**Source:** 2026-07-31 parallel explore agents + user repro → canvas `post-w17-residual-audit`.  
**Rule:** One open item per prompt. Do not batch.

### Primitive / PWA / chrome

- [x] **AURA-461** · P0 · Bug · Checkbox hit pad overlaps labels  
  AURA-375 `box-content p-3 -m-3` kept layout width at 20px while paint was 32px; `gap-2` put “Show archived” into the square. **Done:** `size-11` hit wrapper; no negative margin; real `border`.

- [x] **AURA-462** · P1 · PWA · Admin Preview still leaves scope
  Dashboard / galleries / workflow / Delivery still `target="_blank"` or ActionStack `external` to `/p|/g|/q`. Route through `adminPreviewHref` (finish AURA-445). **Done:** Preview → `adminPreviewHref`; homepage live → same-tab `location.assign`.

- [x] **AURA-463** · P1 · PWA · InstallHint vs wizard sticky footer  
  AdminShell InstallHint `z-50` shares bottom offset with wizard Back/Continue (`z-30`). Use InstallHintDock + raise wizard bottom by `--install-hint-clearance`.  
  **Done:** `InstallHintDock` `aboveChrome` on admin; wizard footer + `--wizard-scroll-pad-bottom` clear `--install-hint-clearance`.

- [x] **AURA-464** · P1 · PWA · InstallHint incomplete on public  
  `/q` `/cancel` still raw InstallHint (no dock/pad); homepage fullBleed Book CTA and gallery print/footer lack clearance; peek dock without content pad.  
  **Done:** Dock+pad on `/q` `/cancel`; homepage hero/footer + gallery/PublicShell footer clearance; `/g` dock; peek `install-hint-pad`.

- [x] **AURA-465** · P1 · Responsive · Gallery hero CTA under thumb bar
  Immersive/cinematic heroes `pb-10`–`pb-16` while thumb bar is `--gallery-thumb-bar` + safe-area — “View gallery” buried at 375.

- [x] **AURA-466** · P1 · UX · Contract sticky Sign vs iOS keyboard
  Dialog uses `useVisualViewportFrame`; sticky Sign does not — keyboard covers Sign/submit.

- [x] **AURA-467** · P1 · Responsive · Peek/sub-album sticky chrome eats viewport
  Sticky AlbumView header + AlbumNav ≈ 200px on SE; collapse nav or unstick on phone/short-vh.

- [x] **AURA-468** · P1 · UX · Admin More drawer → Sheet
  No scrim/focus trap; Close/Log out/Account are raw controls. Portaled Sheet + primitives.

- [x] **AURA-469** · P1 · UI · Delivery Switch-in-label + ad-hoc photo select
  Comments/Watermark Switch nested in `<label>`; Select-all / thumb select use raw buttons. Fix association + use Button/Checkbox.

- [x] **AURA-470** · P1 · Responsive · Week calendar chips &lt;44px on md+
  Desktop week session chips are `py-0.5 text-[10px]` links — use min-h-11 rows like phone.

### Admin / a11y / public polish

- [x] **AURA-471** · P2 · UX · EmptyState coverage gaps
  Documents, NotificationBell, calendar, Settings Library/Watermarks/Website featured, Wrap, SessionShootDay, login soft-load — bare muted text.

- [x] **AURA-472** · P2 · UX · Truncation without `title`
  Projects list, galleries, dashboard delivery issues, calendar chips, AdminSurfacePreview URL.

- [x] **AURA-473** · P2 · A11y · Form label associations
  WebsiteBuilder Switches lack htmlFor; share-photos Dialog Label/Input; SessionTypes duration row; ListEditor Required alignment.

- [x] **AURA-474** · P2 · UI · Ad-hoc public controls  
  AlbumNav chips, SocialLinks pills, favorites heart overlay, homepage mailto/tel, PrintPartners, GalleryDesignPanel cover treatments.

- [x] **AURA-475** · P2 · Responsive · Public long-text residuals  
  `/q` `/cancel` `/book` titles, StudioMark, AlbumTile, contract signed-by, PhotoCommentPanel bodies, datetime-local crush.

- [x] **AURA-476** · P2 · Copy · Entity language residuals  
  Workflow “shoot day”; Prep “Shoot plan ready”; Delivery expire “Clients will…”; mark-accepted “the client”.

- [x] **AURA-477** · P2 · UI · Sheet focus clip + z-index tokens  
  Sheet panel still `overflow-hidden` (Dialog fixed in 460); prefer `--z-*` over hardcoded z-40/50/55/60.

- [x] **AURA-478** · P2 · UX · Sub-album lightbox missing actions  
  No download/favorite footer on sub-album lightbox (hub has LightboxPhotoFooter).

- [x] **AURA-479** · P3 · Polish · Misc residuals  
  Video “Download via single” badge; public FOUC on themed flows; bare “Loading photos…” / q empty; print-hide admin chrome; install-hint-bar height underestimates tall cards.

---

## Phase 13 — Unified UI system (foundation for everything visual)

Goal: one visual language — tokens, primitives, shells — so admin and public stop inventing parallel UI. Performance: shared components, no duplicate CSS recipes.

- [x] **AURA-201** · P1 · UI · Token gaps  
  Scrim/on-media tokens exist (AURA-031). Finish mapping `--text-*`, `--space-*`, `--z-*`, `--duration-*` into `@theme` / utilities; stop hardcoding `z-40/50/60` and magic durations.

- [x] **AURA-202** · P1 · UI · Theme CSS var parity  
  Gallery/studio helpers set accent-ink, surface-elevated, focus, scrim, on-media (AURA-031). Keep open for enforcement: all public surfaces use helpers consistently (032/038/211 overlap); retire ad-hoc color branches. *(032 applied helpers on peek/sub-album/homepage; no ad-hoc hex on public gates.)*

- [x] **AURA-203** · P1 · UI · `ButtonLink` / `Button asChild`  
  Kill `ShootPublicLinks` local linkClass and wizard/helper link-button recipes.

- [x] **AURA-204** · P1 · UI · `ThemeSwatch` primitive  
  One component for Settings + GalleryDesignPanel; Light/Dark grouping shared.

- [x] **AURA-205** · P1 · UI · `SegmentedControl` / `ChoiceCard`  
  Cover style + grid mode + calendar view modes — no raw button grids.

- [x] **AURA-206** · P1 · UI · `List` / `ListRow`  
  Dashboard rows, Documents lists, Payments rows, watermark lists — one pattern.

- [x] **AURA-207** · P1 · UI · `MetricTile`  
  Dashboard counts + Analytics cards — label/value/hint, not ad-hoc Card spam.

- [x] **AURA-208** · P1 · UI · `Panel` variants  
  `static` | `interactive` | `dashed` — replace one-off `border border-line bg-surface p-4`.

- [x] **AURA-209** · P1 · UI · EmptyState variants  
  `centered` | `inline` | `loading` | `error` — kill infinite Loading / bare muted paragraphs.

- [x] **AURA-210** · P1 · UI · `PublicCta` / Button `tone="onMedia"`  
  GalleryHero + cover-none CTAs on photography — design-system, not raw bordered buttons.

- [x] **AURA-211** · P1 · UI · PublicShell adoption  
  `/g`, `/h`, `/book`, `/pay`, `/q`, `/cancel`, peek, sub-album use PublicShell (`bare` for full-bleed). No parallel sticky chrome inventions.

- [x] **AURA-212** · P1 · UI · Overlays only via Dialog  
  ShootDay / helper fixed overlays → Dialog + scrim token.

- [x] **AURA-363** · P1 · Bug · Dialog / confirm viewport center  
  Confirms and `Dialog` can appear at the center of the **document** (or a transformed ancestor) instead of the **viewport**, so after scrolling down the overlay is off-screen. Portal overlays to `document.body` (or equivalent); keep `position: fixed` relative to the viewport; apply to Confirm, Dialog, upload progress, and one-off fixed overlays migrated in AURA-212. Pairs AURA-092 (focus trap) — do portal before or with a11y pass.

- [x] **AURA-213** · P1 · UI · Apply `fontPreset` on public roots  
  CSS vars switch display/body for homepage, book, quote, gallery chrome.

- [x] **AURA-214** · P1 · UI · Radius/shadow consistency pass  
  Cards/inputs/buttons use token radii; retire one-off `rounded-[1.75rem]` except documented device frames.

- [x] **AURA-215** · P1 · UI · Wizard steps use `Tabs`  
  ShootWizardShell custom tab bar → shared Tabs + progress variant (mobile jump included — AURA-067).

- [x] **AURA-216** · P2 · UI · `StatusBadge` domain map  
  Project stage, session status, invoice status, booking request status.

- [x] **AURA-217** · P2 · UI · GalleryNavItem promote or align  
  Icon+label ≥44px; share recipe with IconButton.

- [x] **AURA-218** · P2 · UI · Align public max-width  
  Gallery `1400px` vs `--shell-max` — one public content width token.

- [x] **AURA-219** · P2 · UI · Calendar uses shared chips  
  EventChip → StatusBadge / Chip primitive — not a separate visual language.

- [x] **AURA-220** · P2 · UI · Motion tokens  
  Replace magic 520ms/700ms/1600ms with `--duration-*` / named motion for hero, grid enter, lightbox.

- [x] **AURA-221** · P1 · UI · Enforcement  
  Agent rule `aura-unified-ui.mdc` is source of truth; any new ad-hoc control in a PR is a defect against this phase.

---

## Phase 14 — Modular studio website (foundation → product)

**Vision:** Studio homepage is not a single hardcoded page with a few toggles. It is a **module-based public site** studios compose without developer headache: brand kit + layout modules + collections + booking CTA — previewable, mobile-first, undoable.

### Foundation (do before “lots of themes”)

- [x] **AURA-222** · P1 · Architecture · Brand kit model  
  Persist: logo variants (mark / wordmark / lockup), cover, font roles, primary/secondary accent, social treatment. Theme presets become **starting kits**, not the whole product.

- [x] **AURA-223** · P1 · Architecture · Homepage module schema  
  Ordered modules: `Hero | Bio | Collections | FeaturedGallery | Contact | BookingCta | CustomLinks | Footer`. Each module has typed props; unknown modules ignored safely.

- [x] **AURA-224** · P1 · Architecture · Module renderer  
  Public `/h/[slug]` renders from schema, not one-off JSX conditionals. Admin edits modules, not a mega checkbox form only.

- [x] **AURA-225** · P1 · UX · Website builder admin  
  Drag/reorder modules, enable/disable, inline preview (same renderer as public). 375px preview pane required. No “Save studio” vs “Save homepage” confusion — clear save scopes.

- [x] **AURA-226** · P1 · UX · Live preview without deploy confusion  
  Preview uses production renderer + draft state; Publish is explicit. Avoid headache of “I saved but public didn’t change.”

- [x] **AURA-227** · P1 · Performance · Homepage payload  
  Public homepage API returns only published modules + collection cards needed — not full studio DB. Slug→studioId indexed (AURA-111).

### Brand & layout depth (not 8 boring swatches)

- [x] **AURA-228** · P1 · UI · Typography systems  
  Curated type pairings (display+body) beyond sans/serif/display enum — selectable kits with specimen preview.

- [x] **AURA-229** · P1 · UI · Layout templates  
  Starter site layouts: Editorial, Minimal, Portfolio, Bold — each is a module arrangement + brand kit, fully editable after apply.

- [x] **AURA-230** · P1 · UI · Hero module variants  
  Full-bleed image, split copy/image, typographic-only, logo-lockup — with scrim tokens and PublicCta.

- [x] **AURA-231** · P1 · UI · Collections module variants  
  Masonry / grid / list / cinematic row — shared with gallery grid engine where possible.

- [x] **AURA-232** · P1 · UX · Booking CTA module  
  Deep-links `/book/{slug}`; respects showBooking; empty state guides to session types setup — no dead CTA.

- [x] **AURA-233** · P1 · UX · Contact module (display)  
  Clickable `mailto:` / `tel:`, address formatting, social icons — not plain unlinked text. **In-app message form + Resend delivery** is Phase 19 (AURA-304+) — mailto alone is not “clients can contact the studio.”

- [x] **AURA-234** · P2 · UX · Password / private homepage  
  Proper auth UX (no query-string password); branded gate using PublicShell.

- [x] **AURA-235** · P2 · UX · SEO / share cards  
  Per-site title/description/OG image from brand kit.

- [x] **AURA-236** · P2 · Workflow · Website readiness checklist  
  In admin: logo, at least one module, booking or contact, theme applied — gentle, not naggy.

- [x] **AURA-237** · P2 · Performance · Image delivery for site  
  Responsive srcsets for homepage covers/collections; don’t ship full gallery originals to `/h`.

- [x] **AURA-238** · P3 · Polish · Custom domain (later)  
  Document as future; don’t block builder on DNS product.

---

## Phase 15 — Modular client gallery interface (foundation → product)

**Vision:** Client galleries are a **designed experience system** — cover, chrome, grid, albums, selects, download — configurable in depth without a maze of hex fields or 4 lonely theme tiles. Photographers get tasteful control; clients get clarity and zero friction.

### Foundation

- [x] **AURA-239** · P1 · Architecture · Gallery design document v2  
  Separate **experience config** from color preset: cover module, chrome module, grid module, selects module, download module, motion preference. Presets are starting points that fill the schema.

- [x] **AURA-240** · P1 · Architecture · Design presets as packages  
  Apply preset → writes full schema (layout + type + chrome + colors). Studio can then customize modules. Retire “8 themeIds with special-case JSX in GalleryHero.”

- [x] **AURA-241** · P1 · Architecture · Data-driven GalleryHero  
  Hero layout/type/CTA from schema (`split|centered|vertical|minimal|cinematic`), not `if (themeId === "sage")` branches.

- [x] **AURA-242** · P1 · UX · Gallery designer admin  
  Delivery → Design becomes a real designer: preview device frame, module panels, undo, reset-to-preset. Mobile-friendly controls (no crushed color inputs — swatches + modules).

- [x] **AURA-243** · P1 · Performance · Design save  
  PATCH gallery design doc only — never full studio RMW for a cover style toggle.

### Cover, chrome, grid (depth)

- [x] **AURA-244** · P1 · UI · Cover treatments library  
  Full / third / none / immersive / split-title — focal point, scrim strength, title placement, date/days-left visibility.

- [x] **AURA-245** · P1 · UI · Gallery chrome variants  
  Minimal sticky, floating actions, bottom bar (mobile), studio-branded header with logo optional.

- [x] **AURA-246** · P1 · UI · Shared grid engine  
  Masonry / justified / columns / diary — one engine for gallery + homepage collections; enter motion from tokens.

- [x] **AURA-247** · P1 · UX · Albums / sub-albums as first-class  
  Client navigation between albums with PublicShell; back links; download policy per album if needed.

- [x] **AURA-248** · P1 · UX · Selects / favorites productized  
  Per-visitor favorites (AURA-005) + optional studio select-limit with visible “X of Y” + submit-for-review workflow.

- [x] **AURA-249** · P1 · UX · Download UX clarity  
  PIN flow, originals vs previews, favorites zip, video policy — spelled in UI, no silent empty zips (AURA-037).

- [x] **AURA-250** · P1 · UX · Guest path with zero headache  
  Expired/archived/draft states: branded message + contact. Loading/error never infinite. Favorites/share/download work one-handed at 375px.

### Taste & power (advanced, still friendly)

- [x] **AURA-251** · P1 · UI · Gallery brand override  
  Inherit studio brand kit or override per gallery (wedding vs brand shoot) without fighting globals.

- [x] **AURA-252** · P2 · UI · Motion / density preferences  
  Calm vs cinematic motion; compact vs airy spacing — photographer chooses, clients don’t configure.

- [x] **AURA-253** · P2 · UI · Lightbox module  
  Focus trap, captions/filenames, comments, video — tokenized scrim; works on dark and light experiences.

- [x] **AURA-254** · P2 · UX · Client “how to use this gallery”  
  Optional first-visit coach marks (dismissible, sparse) — not a tutorial wall.

- [x] **AURA-255** · P2 · Workflow · Delivery publish checklist  
  Photos uploaded, PIN set, cover chosen, design applied, go live, email client — one panel, no scavenger hunt.

- [x] **AURA-256** · P2 · Performance · Gallery public GET  
  No analytics RMW on view (AURA-003); optional expire check without rewriting whole studio; paginate or virtualize huge grids.

- [x] **AURA-257** · P2 · A11y · Gallery experience  
  Keyboard lightbox, announced view changes, touch targets, reduced-motion respect.

- [x] **AURA-258** · P3 · Polish · PWA per gallery
  Manifest colors/icons from gallery design schema (AURA-043; Phase 18 AURA-288–297).

- [x] **AURA-259** · P3 · Polish · Print partners surface  
  If API returns partners, show a quiet print CTA module — or remove dead field.

---

## Phase 16 — Cross-cutting “no headache” studio workflows

- [x] **AURA-260** · P1 · UX · Guided first project  
  After signup/Connect: create project → send quote → contract → deposit checklist with progress, not empty dashboards.
  **Done:** `buildFirstProjectGuide` + dashboard `FirstProjectChecklist` (hides after deposit); projects `?new=1` + empty CTA.

- [x] **AURA-261** · P1 · UX · Single progress spine  
  One UI that spans project workflow + session tools (AURA-017) with plain labels (“Get paid”, “Deliver photos”).
  **Done:** Plain `path.ts` labels; dropped Book/Session section headers; one-spine copy + `workflowStepLabel`; project create-session confirm aligned.

- [x] **AURA-262** · P1 · UX · Undo / confirm on destructive  
  Archive, delete, replace quote, refresh plan, go live — consistent ConfirmProvider + consequence copy.
  **Done:** `destructive-confirm` copy helpers; Go live + mark delivered confirms; archive/delete/replace/refresh wired; Ideas delete confirm.

- [x] **AURA-263** · P1 · UX · Deep links everywhere  
  Notifications, dashboard flags, analytics rows → exact admin screen + step (Bookings for new booking — already fixed pattern).
  **Done:** `admin-deep-links` helper; notifyStudio → `#workflow` / delivery; dashboard expiring → Open delivery; analytics rows linked; `#workflow` scroll.

- [x] **AURA-264** · P2 · UX · Offline / slow network honesty  
  Uploads and saves show pending/error; no silent success.
  **Done:** `mutateJson` + upload offline copy; DeliveryStep/Prep success gated; settings + website builder + project save try/finally.

- [x] **AURA-265** · P2 · UX · Permissions clarity  
  Single-owner only via AURA-346 — no teased team invites.

- [x] **AURA-266** · P2 · Docs · In-app sparse help  
  One-line help only where control is unclear (aura-ui-copy) — link to deeper docs if needed, never essays in PageHeader.
  **Done:** Trimmed PageHeader/SectionIntro essays; Session types via ButtonLink; removed restating Field hints; aura-ui-copy PageHeader rule.

- [x] **AURA-267** · P1 · Performance · Upload pipeline  
  Parallelize safe uploads within limits; clear progress; timeout messaging; don’t hold studio write lock during Sharp (pairs AURA-002/061).
  **Done:** `FILE_UPLOAD_CONCURRENCY=3` + per-file %; upload timeouts; `appendStudioPhotos` assigns sortOrder/cover in writeQueue; Sharp stays outside lock (002/361). AURA-061 unrelated.

- [x] **AURA-268** · P1 · Performance · Admin list virtualization  
  Projects/Bookings/Documents grow — virtualize or paginate before they feel broken.
  **Done:** Server pagination (`admin-list-page`, limit 50) + scoped collection reads (no full-studio); Load more on Projects/Bookings history/Documents; contract bodies omitted; `?options=1` for selects.

- [x] **AURA-269** · P2 · Reliability · Idempotent admin actions  
  Send quote / send contract / email pay link — safe retries, no duplicate spam.
  **Done:** `Idempotency-Key` + in-process cache/singleflight (15m); quote/contract/pay email routes + workflow/payments UI; intentional re-send uses new key.

- [x] **AURA-270** · P2 · Security · Public write amplification  
  Comments/favorites/book submissions can’t DoS studio writes once persist is fixed; rate limit + cheap paths.
  **Done:** `clientIp` + rate limits on comments/photo-view/subalbums/book/questionnaire/proposal/contract/cancel; public POSTs use `appendStudioDoc`/`patchStudioDoc` (no public `updateStudioDb`).

---

## Phase 17 — Definition of done for “fully refined Aura”

Use this as the exit criteria before calling the backlog “complete enough” for a major release:

- [x] **AURA-271** · P1 · DoD · Data honesty  
  No dropped fields; no fake payments; no global favorites overwrite; draft tokens gated.
  **Done:** Verified 001/152 round-trip, 004 fail-closed pay, 005 per-visitor favorites, 006 gallery/quote gates; added `assertPublicContractAccess` for draft/canceled contracts.

- [x] **AURA-272** · P1 · DoD · Persist performance  
  Hot paths are per-entity; public gallery traffic cannot wipe uploads; measured OK at multi-instance.
  **Done:** Public routes = append/patch/`recordEvent` only (no `updateStudioDb`); upsert-only `writeStudioCollection` + `appendStudioPhotos` prevent wipe under multi-instance. Shared rate-limit store remains **AURA-107** (per-process limits are not a wipe risk).

- [x] **AURA-273** · P1 · DoD · One domain language  
  Admin + API + types say Project/Session/Quote; dual collections gone or flagged off.
  **Done:** `AURA_LEGACY_COLLECTIONS=0` flag; `/api/sessions/[id]/{plan,wizard,wrap}`; admin FE → projects/sessions; clients/shoots Deprecation headers; ADR updated. UI copy leftovers → **086**/**278**; delete alias routes → **384**.

- [x] **AURA-274** · P1 · DoD · Unified UI  
  No ad-hoc button/input recipes; PublicShell on public surfaces; theme vars complete; primitives cover lists/metrics/swatches/CTAs.
  **Done:** PublicShell on all public routes; theme var parity (202); List/MetricTile/ThemeSwatch/PublicCta/ButtonLink present; cleared 082/083 leftovers (helper/ShootDay). Card density → **084**.

- [x] **AURA-275** · P1 · DoD · Website builder MVP  
  Module schema + renderer + admin reorder/preview/publish + brand kit — not checkbox soup alone.
  **Done:** Verified 222–237 (schema/renderer/builder/preview/publish/brand kit/375 DeviceFramePreview). Settings Website → Site builder primary; contact-detail toggles only (bio/social/order in builder).

- [x] **AURA-276** · P1 · DoD · Gallery designer MVP  
  Experience schema + presets-as-packages + data-driven hero/chrome/grid + publish checklist + mobile-proof client UX.
  **Done:** Verified 239–258: design v2 + preset packages; data-driven GalleryHero/Chrome/MediaGrid; GalleryDesignPanel 375 DeviceFramePreview + undo; DeliveryPublishChecklist; no themeId hero branches; guest/coach/PWA from W10/W12.

- [x] **AURA-277** · P1 · DoD · Happy path demo  
  Book → confirm → quote → contract → deposit → prep → shoot day → delivery → wrap works on phone without scavenger hunt or contradictory badges.
  **Done:** Spine 017/261 + mobile workflow/wizard; fixed 119/120 advance rules in `state-rules` + payments/contract sign; closed 118. Residual stage-label polish → copy pass **278** if needed.

- [x] **AURA-278** · P2 · DoD · Copy & a11y pass  
  No infra leakage; Project/Session terminology; touch targets; dialogs focus-trapped.
  **Done:** Dialog `useFocusTrap` + Escape; closed 085/086; touch ≥44 via primitives/W12. Residual “Shoot day” wizard step label kept as activity language.

- [x] **AURA-279** · P2 · DoD · Observability  
  Failed emails/payments/calendar sync visible to studio without reading server logs.
  **Done:** `notifyDeliveryIssue` on dead contact outbox, calendar health error change, Connect lastError change; dashboard Delivery issues; Settings Integrations still surfaces payments/calendar.

- [x] **AURA-280** · P3 · DoD · ADR + agent rules current  
  AURA_ISSUES, unified-ui, one-issue, design-system, responsive, PWA, copy rules all agree.
  **Done:** ADR expanded (persist + agent contract); rules cross-link peers; `AGENTS.md` entry; closed 126/058/059 as already satisfied.

---

## Phase 18 — Fully responsive + PWA (cross-cutting productization)

Goal: every admin and public surface is **phone-first** and a **real installable PWA** — not a desktop site with a manifest file bolted on. Apply Responsive + PWA bars to all earlier phases; this phase closes systemic gaps.

### R0 — Responsive system

- [x] **AURA-281** · P1 · Responsive · Safe-area + viewport  
  Root shells use `viewport-fit=cover` + padding from `env(safe-area-inset-*)` on sticky headers, bottom nav, gallery chrome, Dialog sheets. No content under notch/home indicator in browser or standalone.

- [x] **AURA-282** · P1 · Responsive · Admin 375px audit pass  
  Dashboard, Projects, Bookings, Calendar, Documents, Payments, Settings, Analytics — no horizontal page scroll; hamburger/bottom tabs; tables → cards; ≥44px targets. Log residual gaps as new IDs only if found after pass.

- [x] **AURA-283** · P1 · Responsive · Public 375px audit pass  
  `/book`, `/g`, `/p`, `/c`, `/q`, `/pay`, `/h`, `/cancel`, sub-album, peek — one-handed CTAs; sticky chrome budget; forms stack; no landscape required.  
  **Audit OK:** book / pay / q / cancel happy-path forms, ContactStudio, soft-failure contact (book/pay/quote), Dialog/PinModal.  
  **Done:** `html`/`body` + PublicShell/`StudioHomepageView` `overflow-x-clip` + `min-w-0`; homepage hero `split` stacks to `lg` with column `min-w-0`; HeroMark/`GalleryHero` titles `break-words`; gallery vertical type + split row from `md` only; quote hero + homepage type/lockup safe-area retained at `sm+`; contract sticky Sign `min-w-0` + `md:hidden`; justified grid `min-w-0`; AlbumNav/cinematic edge fades (full affordance pass → **377**). Gallery chrome density → **378**.

- [x] **AURA-284** · P1 · Responsive · Wizard / workflow chrome  
  Shoot wizard + project workflow: progress + current step only on small screens; Continue/Back always visible; no horizontal step scavenger hunt (pairs AURA-067/088).  
  **Done:** Sticky Back/Skip/Continue above AdminShell tabs + safe-area; `ProjectWorkflowPanel` mobile progress + jump Select (one step card); Delivery Layout hides publish farm/checklist + wizard footer, `GalleryDesignPanel` `embedded` + progress module tabs; `ShootPublicLinks` header density (Copy from `md`). Button-stack farms → **088**.

- [x] **AURA-285** · P1 · Responsive · Builder/designer preview  
  Website module builder + gallery designer ship a forced **375px** preview mode as primary; desktop preview secondary.  
  **Done:** shared `DeviceFramePreview` — logical 375 / 960 + `transform: scale` to fit column; Phone/Desktop toggle (Phone default); WebsiteBuilder preview-first below `lg`. Sticky designer under AdminShell → **381**.

- [x] **AURA-286** · P2 · Responsive · Landscape phone / tablet  
  Critical paths usable in landscape (gallery lightbox, contract sign, pay) without clipped CTAs.  
  **Done:** `roomy` (768×560+) / `short-vh` (≤560h) variants; GalleryChrome thumb bar unified on `roomy`; contract Sign sticky until roomy; lightbox short-vh side rail for footer; AlbumView unsticks + denser header on short-vh; vertical-rl / split CTA only when roomy. Admin content height → **376**.

- [x] **AURA-287** · P2 · Responsive · Density tokens  
  Spacing/type scale that stays readable at 375 without crushing; avoid fixed `min-w-[640px]` layouts anywhere in app shells.  
  **Done:** `--density-`* / `--field-min-width` / `--text-display` clamp; SegmentedControl 2-col grow below `sm`; ShootDayStep field stacks; StringListEditor Remove stacks; PageHeader + AdminShell use density spacing. No `min-w-[640px]` shells. Prep panel action farms / bare links → **376**.

### Deep responsive audit residuals (2026-07-30)

Parallel audit of admin + public + wizard/builder + CSS anti-patterns. Enrich existing IDs above; **do not** re-file OK surfaces (AdminShell hamburger/tabs, Settings mobile Select, list→cards, Button `sm` ≥44px after 282).

- [x] **AURA-375** · P1 · Responsive · Switch / Checkbox hit areas  
  `Switch` track `h-7` and `Checkbox` `size-5` under 44px even when row is tall. Grow control or invisible hit padding. Pairs AURA-082 (raw inputs → primitives).  
  **Done:** Switch control `h-11`/`w-14` with centered `h-7` track; Checkbox `p-3 -m-3` hit expand (visual `size-5`).

- [x] **AURA-376** · P1 · Responsive · Admin residual touch + list crush  
  Bare `text-sm text-accent` links without `min-h-11`: `ProjectWorkflowPanel` (Client link / Preview / Manage packages / Open gallery), shoot helper “View example”, bookings pending `mailto`. Prep `PackagesPanel` / `ShotListsPanel` row actions. `StringListEditor` stack done with **287**. ShootDayStep native checkboxes → ≥44px (pairs 068/082).  
  **Done:** Workflow links already ActionStack (**088**); helper View example + bookings mailto `min-h-11`; Packages/ShotLists row actions stack below `sm`; ShootDay/ListEditor/SessionTypes/Projects → `Checkbox` primitive.

- [x] **AURA-377** · P1 · Responsive · Contained scroll affordances  
  Horizontal rails must show fade/swipe hint (not only hide scrollbar): shoot helper category chips (`overflow-x-auto`), `AlbumNav`, homepage cinematic collections. Contained scroll OK; invisible edge is not.  
  **Done:** `ScrollRail` — L/R fades track scroll overflow; helper categories, `AlbumNav`, cinematic collections.

- [x] **AURA-378** · P1 · Responsive · Public gallery phone chrome  
  (1) `AlbumView` sticky header on peek/sub-album: safe-area + back + title + up to 4 actions + AlbumNav — collapse budget. (2) `GalleryChrome` bottom labels (`Submitted (12)`, favorites count, Download/Share/Message) overflow 375 — compact/icon-primary. (3) Masonry tile actions always-on with long labels crush tiles — icon-only or sheet. (4) GalleryChrome / GalleryHero / lightbox chevrons: L/R `shell-pad` or safe-area (not raw `px-*` / `left-1`). (5) Unify floating (`sm`) vs sticky/branded (`md`) bottom-bar breakpoints.  
  **Done:** AlbumView compact back/title/actions; AlbumNav label from `sm`; thumb bar `iconOnly`; tile actions icon-only; chrome/hero `shell-pad`; lightbox chevrons safe-area; breakpoints already `roomy` (**286**).

- [x] **AURA-379** · P1 · Responsive · Bare public safe-area residuals  
  Closed with **AURA-283**: `/p` quote hero top safe-area; `/h` type/lockup/fullBleed-fallback + footer bottom inset; PublicShell `sm` padding keeps `max(..., env(...))`.

- [x] **AURA-380** · P2 · Responsive · Dialog / sheet max-height
  Shared `Dialog` (upload status, tall confirms) needs `max-h` + internal scroll for short/landscape viewports (363 portal done; height not).  
  **Done:** `max-h-full` + flex column; sticky title; body `overflow-y-auto`; removed local `85vh` workarounds.

- [x] **AURA-381** · P2 · Responsive · Sticky under AdminShell
  Admin sticky panels (e.g. `GalleryDesignPanel` `lg:sticky lg:top-4`) must offset below sticky header + `safe-area-inset-top`.  
  **Done:** `--admin-sticky-top` / `--admin-header-inner` tokens; GalleryDesignPanel `lg:top-[var(--admin-sticky-top)]`.

- [x] **AURA-382** · P2 · UX · Cancel soft-failure Message
  `/cancel/[token]` blocked/unavailable state: offer Message studio (`PublicSoftFailureContact`) like book/pay/quote — not only dead-end copy.  
  **Done:** cancel page soft-fail + `cancelToken` contact resolve.

- [x] **AURA-383** · P2 · Responsive · Designer module nav at 375
  Gallery designer 6 module Tabs wrap into scavenger rows — reuse Tabs `progress` / Select pattern below `md` (pairs 285).  
  **Done:** GalleryDesignPanel always `variant="progress"` (phone Select + desktop tabs).

### P0 — PWA foundation

- [x] **AURA-288** · P1 · PWA · Manifest matrix
  Distinct, correct manifests: (1) studio admin app, (2) per-gallery token, (3) studio homepage/book when installable. Each has correct `start_url`, `scope`, name, icons, theme colors from brand/design.  
  **Done:** `/admin`, `/g/{token}`, `/h/{slug}`, `/book/{slug}` manifests + wiring; root = Aura fallback; `studio-pwa-manifest` helper.

- [x] **AURA-289** · P1 · PWA · Icons + maskable
  192/512 + `purpose: "maskable"` (and any) generated from studio logo / Aura mark; no broken MIME; gallery can override with brand mark when set.  
  **Done:** `/api/pwa-icon` sharp PNG (any + maskable pad); static Aura icons committed; manifests use same-origin URLs; gallery `appIconUrl` override.

- [x] **AURA-290** · P1 · PWA · Service worker strategy
  Document + implement: precache shell/static; network-first for APIs; never cache Set-Cookie auth mistakes; versioned updates with controlled activate (no stuck old SW after deploy).  
  **Done:** `sw.js` v3 + `docs/PWA_SERVICE_WORKER.md`; API network-only; `/offline.html` navigate fallback; `updateViaCache: "none"` + SKIP_WAITING.

- [x] **AURA-291** · P1 · PWA · Offline honesty
  Offline page / toast for admin and public: clear message + retry. Gallery may show last-cached thumbnails if safe; never claim “saved” when a mutation failed offline. **Navigate fallback currently uses studio `/` shell for public routes** — add offline public fallback / copy.  
  **Done:** OfflineStatus toasts; gallery mutation catches + offline guest copy; helper optimistic revert; navigate fallback already `/offline.html` (290).

- [x] **AURA-368** · P1 · PWA · SW scope + R2 media  
  Root `sw.js` registers globally (incl. under `/g/{token}`); cache strategy still assumes `/api/media/` cache-first while browse uses R2 signed URLs. Scope per surface; update fetch strategy post-R2 (pairs 290/297).  
  **Done:** RegisterSW scopes `/admin/` `/g/` `/h/` `/book/`; drop legacy `/`; sw v4 never caches R2/`X-Amz-`*/`/api/media`.

- [x] **AURA-292** · P1 · PWA · Standalone chrome  
  Detect `display-mode: standalone` (and iOS `navigator.standalone`): hide redundant browser-only UI; keep logout/account reachable; bottom tabs clear of home indicator.  
  **Done:** `useDisplayModeStandalone` + `data-standalone` / `.browser-only`; AdminShell Account + Log out when installed; tab `pb` max with safe-area.

- [x] **AURA-293** · P1 · PWA · Install UX
  Optional sparse “Add to Home Screen” hint on gallery + admin (dismissible, not naggy). iOS Safari path documented in UI one-liner where install prompt unavailable.  
  **Done:** `InstallHint` — BIP Install + iOS Share one-liner; Not now persists; `.browser-only` / standalone hidden.

- [x] **AURA-294** · P1 · PWA · Auth in installed app
  Cookie/session works in standalone; login → return to intended admin route; no bounce to wrong origin/scope.  
  **Done:** `safeAdminNext`; middleware keeps query; layout bounce on expired session; logout clears cookie with path; Google callback stays on request host.

- [x] **AURA-385** · P0 · PWA · Stay signed in (standalone)
  Installed admin loses Aura cookie across cold starts while Firebase Auth often remains; user must re-enter password.  
  **Done:** Set-Cookie on login/signup/logout `NextResponse` + `maxAge`; IndexedDB Firebase persistence; silent idToken→cookie restore on `/admin/login`; `clientLogout` clears Firebase too.

- [x] **AURA-295** · P1 · PWA · Theme color sync
  `theme-color` meta + manifest track active studio/gallery theme (light/dark kits) so OS chrome matches experience (extends AURA-043).  
  **Done:** theme-color / theme_color = kit canvas; apple statusBar from bg; Brand save `router.refresh()`.

### P1 — Surface-specific PWA

- [x] **AURA-296** · P1 · PWA · Admin as daily driver
  Installed admin opens to Dashboard (or last useful route); push/email deep links open correct in-app screens when possible.  
  **Done:** last-route resume in standalone; `launch_handler` + `handle_links`; safe `#messages` hash through login.

- [x] **AURA-297** · P1 · PWA · Client gallery install
  Installed gallery scoped to `/g/{token}`; favorites/selects survive reload; download flows work from standalone (no broken blob/window assumptions).  
  **Done:** `preferExistingWindow` on gallery manifest; `downloadSignedUrl` blob/iframe (no `_blank`); favorites already cookie+API.

- [x] **AURA-298** · P2 · PWA · Booking + homepage install
  Optional install for `/h/{slug}` / book flow with studio name/icons — clients get studio brand, not generic Aura.
  **Done:** `preferExistingWindow` on `/h` + `/book` manifests; dismissible `InstallHint` (per-slug keys); brand/icons/theme from existing 288/289/295 paths.

- [x] **AURA-299** · P2 · PWA · Quote / contract / pay
  Lightweight: correct viewport + theme-color + Add-to-Home optional; no requirement for heavy offline caching of legal/pay pages.
  **Done:** `/p` `/c` `/pay` layouts + manifests (studio theme-color/icons); InstallHint; no SW (`pwaSwSurfaceForPath` none); `proposal`/`contract`/`pay` pwa-icon keys.

- [x] **AURA-300** · P2 · PWA · Media cache budget
  Cap cached gallery bytes; prefer preview/thumb URLs; don’t fill device storage with originals.
  **Done:** SW v5 `aura-media-`* 48MiB; cache-first `-thumb`/`-web`/`-wm` only (R2 + `/api/media`); never `/originals/`; preview-first eviction.

### DoD add-on (responsive + PWA)

- [x] **AURA-301** · P1 · DoD · Responsive everywhere  
  Happy-path + builders pass 375px/768px gates; safe-area respected; no page-level horizontal scroll on audited routes. Close when **283**–**287**, **088**/**089**, **375**–**383** are done (or superseded).
  **Done:** Prerequisites verified closed — **281**/**282**, **283**–**287**, **088**/**089**, **375**–**383** (incl. **379** with 283). No open responsive residuals in that set.

- [x] **AURA-302** · P1 · DoD · PWA installable  
  Lighthouse/installability criteria met for admin + gallery (manifest, SW, icons, HTTPS); branding correct per surface; offline honest; standalone usable.
  **Done:** Prerequisites verified — **288**–**300**, **368** (manifest matrix, icons/maskable, SW v5 + scopes, offline honesty, standalone, install UX, auth, theme-color, admin/gallery/h/book surfaces). HTTPS via production host.

- [x] **AURA-303** · P2 · DoD · Responsive + PWA in agent rules  
  Every UI fix checked against responsive + PWA bars; `aura-responsive.mdc` + `aura-pwa.mdc` enforced like unified-ui.
  **Done:** Rules alwaysApply + peer-weight language; build/DoD checklists; SW/media budget + surface matrix current; one-issue #6 + issues Rules/PWA bar updated; W12 closed.

---

## Phase 19 — Client → studio contact (Resend)

**Problem today:** Homepage can show the studio email as plain text (`showEmail`); there is no reliable in-app way for a client to message the photographer. `mailto:` depends on the device having a mail app and does not give the studio a productized inbox trail.

**Product goal:** Clients contact the studio from public surfaces (homepage, gallery, booking, expired/unavailable states) via a calm form; **Resend delivers** the message to the studio’s owner/contact email with `replyTo` set to the client so Reply works. Prefer **outbound Resend** (form → API → `emails.send`) as the primary path — works with existing domain/API key setup. Optional later: Resend **inbound** receiving for studio@domain.

Do not narrate “Aura / Resend / Firebase” in UI copy — labels like “Message”, “Send”, “Email” only.

### Contact product (Resend outbound)

- [x] **AURA-304** · P1 · Product · Public contact form  
  Shared `ContactStudio` UI (name, email, message, optional phone/context). Works at **375px**; honeypot + disable-while-sending; success/error sparse. Used by homepage Contact module, gallery chrome, and empty/expired states that today only say “unavailable.”

- [x] **AURA-305** · P1 · API · `POST /api/public/contact` (or `/h/[slug]/contact`, `/g/[token]/contact`)  
  Resolve studio by homepage slug and/or gallery token. Validate length, email shape, rate-limit per IP + per studio. **No full-studio RMW** — append a lightweight `contactMessages` (or notify-only) if persistence desired; delivery must not depend on RMW.

- [x] **AURA-306** · P1 · Email · Resend deliver to studio  
  Use existing notify/Resend helper pattern: `to` = studio `ownerEmail` (or dedicated contact email if added), `replyTo` = client email, subject includes studio name + source (Homepage / Gallery / Booking). HTML + text; escape all interpolated strings (pairs AURA-041). Failures surface honestly to client (“Couldn’t send — try again”) and are loggable (pairs AURA-149 outbox).

- [x] **AURA-307** · P1 · UX · Homepage Contact module sends via form  
  When Contact module / `showEmail` is on: primary action is **Send message** (Resend), with optional secondary `mailto:` / `tel:`. Plain text email alone is insufficient.

- [x] **AURA-308** · P1 · UX · Gallery → contact studio  
  Favorites/download/expired/help paths expose Contact (or “Message {studio}”) without leaving the gallery experience; include gallery/project context in the Resend body.

- [x] **AURA-309** · P1 · UX · Booking / quote / pay dead-ends  
  Soft failures (sold out, expired quote, pay unavailable) offer Message studio — not only a dead end.

- [x] **AURA-310** · P1 · Settings · Contact prefs  
  Studio can set which address receives contact mail (default ownerEmail), toggle contact form on homepage/gallery, and optional auto-reply acknowledgment to the client (also via Resend).

- [x] **AURA-311** · P1 · Admin · Contact notifications  
  New contact → studio email (AURA-306) + optional in-app dashboard flag / deep link. Respect notification prefs pattern used elsewhere.

- [x] **AURA-312** · P1 · Security · Abuse controls  
  Rate limits, max body size, honeypot/time-trap, strip HTML from client message, never execute inbound content. CAPTCHA only if abuse demands it (keep UX calm).

- [x] **AURA-313** · P2 · Reliability · Contact outbox / retry  
  Fold into durable email outbox (AURA-149) so Resend blips don’t drop client messages silently.

- [x] **AURA-314** · P2 · UX · Client confirmation email  
  Optional Resend “We received your message” to the client (studio-branded, sparse).

### Optional Resend inbound (later)

- [x] **AURA-315** · P3 · Email · Resend inbound receiving  
  If studios want `hello@studio.com` on Aura-managed receiving: Resend inbound webhook → verify signature → store/forward to owner. Treat as untrusted input (agent-email-inbox patterns). **Not required** for MVP contact — form + outbound Resend is the foundation.

- [x] **AURA-316** · P2 · DoD · Client can always reach studio  
  From homepage (when contact enabled) and from a live gallery: client can send a message; studio receives it in email with working Reply; no dependency on the client’s local mail app.

### Project-routed inbound (no in-app compose)

**Problem:** Transactional mail sets Reply-To to the studio owner’s personal address, so client replies never hit Aura and can be missed relative to the project. Studio-level inbound (`slug@` / `s-{id}@`) exists but is not project-scoped.

**Product goal:** Each project gets an Aura-assigned inbound address. Client correspondence for Aura-driven work Reply-To’s that address → Resend webhook → in-app notify + Messages trail on the project. Studio may still reply from their mail client; **do not** build in-app compose / Inbox (forever out). Optional forward copy to owner inbox.

- [x] **AURA-371** · P2 · Email · Per-project inbound address  
  Resolve `p-{projectId}@RESEND_INBOUND_DOMAIN` (and optional `sess-…`) in inbound webhook; store `contactMessages` with `projectId` / `sessionId`; notify with href to project. Catch-all local-part; no per-address Resend provisioning. Sanitize as AURA-315.

- [x] **AURA-372** · P2 · Email · Transactional Reply-To → project inbound  
  Quote / gallery / booking / contract / pay client emails: when a project is known, set Reply-To to the project inbound address (display name = studio), not `ownerEmail`. Keep From on verified sending domain. Document caveat: studio reply From personal mail can drift the thread.

- [x] **AURA-373** · P2 · Admin · Project Messages trail  
  Project (and optional session) page: read-only list of linked `contactMessages` + Reply (`mailto:` to client). Dashboard Messages can filter / deep-link by project. No compose UI.

- [x] **AURA-374** · P3 · Email · Optional “Reply via Aura” send-only  
  From project Messages: send a Resend email From studio display / platform address with Reply-To = project inbound so the loop stays on the routed address. Still not Inbox — one-shot send, no threads UI. After 371–373.

---

## Phase 20 — Unified Studio Settings (tailor the company)

**Problem today:** `/admin/settings` is one mega-page (Studio, Homepage, Notifications, Integrations, Watermarks) with confused save scopes. Studio-level configuration is also scattered across **Payments** (Stripe Connect), **Bookings** (session types), **Documents / Prep / Packages / Shot lists** (templates), and **per-gallery Delivery** (defaults that should be studio-wide). Fields exist on `Studio` with no UI (`ownerFirstName`/`LastName`, `country`, `addressLine2`, `defaultCoverImageUrl`). Photographers cannot calmly tailor their company from one place.

**Product goal:** A robust, extensive, **sectioned Settings** experience — phone-first, clear save scopes, deep-links from ops hubs — covering everything a studio needs to brand, book, deliver, notify, integrate, and administer the business. Keep **ops** (booking inbox, payment ledger, per-project Delivery) outside Settings; put **setup/defaults** inside.

**Keep primary outside Settings:** Booking requests, invoices/transactions, project/session tools, Analytics dashboards.  
**Move or deep-link into Settings:** Connect, session-type library entry, template library index, delivery defaults, website builder entry, contact prefs.

### Recommended IA (`/admin/settings` + `/admin/settings/[section]`)


| Section               | Purpose                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Account**           | Owner identity, email, logout, password/sessions (future)                                       |
| **Brand**             | Name, tagline, logos, theme kits, typography, social                                            |
| **Business**          | Phone, website, address (+ country/line2), TZ, date format, print partners                      |
| **Website**           | Enable, slug, password, modules/builder, layout, featured collections, contact, preview/publish |
| **Delivery defaults** | Watermark default, gallery theme/grid, comments, expiry, select limit, PIN policy               |
| **Booking**           | Public book URL, buffers, session-types manage/deep-link                                        |
| **Payments**          | Stripe Connect status/manage, currency, default deposit/link templates (deep-link ledger)       |
| **Notifications**     | Studio + client email toggles; contact recipient / auto-reply                                   |
| **Integrations**      | Google Calendar, Stripe status, future                                                          |
| **Library**           | Index/links: contracts, questionnaires, packages, shot lists, watermarks                        |
| **Team**              | Members/roles when productized (or honest single-owner)                                         |
| **Data & danger**     | Export, disconnect integrations, delete studio                                                  |


### S0 — Shell & save model

- [x] **AURA-317** · P1 · Architecture · Settings shell + subnav  
  Replace mega-page with routed sections (sidebar on `md+`, stacked nav / select on 375px). Extends AURA-070. `AdminShell` More → Settings lands on overview or last section.

- [x] **AURA-318** · P1 · UX · Split save scopes  
  Per-section Save (Brand / Business / Website / Notifications / …). No “Saved with Studio settings” for Notifications. Unsaved-changes guard per section (dirty state). Watermarks keep their own save.

- [x] **AURA-319** · P1 · UX · Settings overview  
  At-a-glance readiness: brand complete, Connect, calendar, homepage live, delivery defaults set — sparse checklist, links into sections (not a second product).

- [x] **AURA-320** · P1 · Responsive · Settings at 375px  
  Section nav usable; address/forms stack (AURA-087); touch targets; no horizontal scroll.

### S1 — Account

- [x] **AURA-321** · P1 · Settings · Account section  
  Owner email display, name fields (`ownerFirstName`/`ownerLastName` — wire existing API fields), Log out. Clear “who receives studio emails” when contact prefs diverge.

- [x] **AURA-322** · P2 · Settings · Password / sessions  
  Change password + list/revoke sessions if auth supports it; otherwise don’t tease. Honest single-owner until Team ships.

### S2 — Brand

- [x] **AURA-323** · P1 · Settings · Brand section  
  Studio name, tagline, primary logo upload, cover/inverted logo via `FileUploadButton` (AURA-091), theme kits via `ThemeSwatch` (AURA-204), social links. Foundation for brand kit (AURA-222).

- [x] **AURA-324** · P1 · Settings · Typography control  
  Expose type pairing / `fontPreset` clearly (from curated kits) — not only buried inside a color theme preset.

- [x] **AURA-325** · P1 · Settings · Default cover / OG image  
  Wire `defaultCoverImageUrl` (upload) for website/share cards; no raw URL-only field.

- [x] **AURA-326** · P2 · Settings · PWA install branding  
  Icons/name/theme-color for admin install derived from Brand (Phase 18) — controls or “uses Brand kit” note, not a third orphan palette.

### S3 — Business profile

- [x] **AURA-327** · P1 · Settings · Business section  
  Phone, website, address line1/2, city, region, postal, **country**, print partners. Completeness for public homepage contact (country already used publicly).

- [x] **AURA-328** · P1 · Settings · Time zone picker  
  Validated IANA picker (AURA-090) — no free-text drift.

- [x] **AURA-329** · P1 · Settings · Date format  
  Keep curated formats; preview sample date in studio TZ.

### S4 — Website

- [x] **AURA-330** · P1 · Settings · Website section shell  
  Enable, slug + copy/view, password gate UX (no query-string password — AURA-234), biography + visibility toggles until module builder lands.

- [x] **AURA-331** · P1 · Settings · Website → builder entry  
  Deep-link / embed module builder (Phase 14). Clear Publish vs draft. Preview reflects live theme/layout (AURA-098).

- [x] **AURA-332** · P1 · Settings · Featured collections  
  Single source of truth for `showOnHomepage` — remove duplicate toggles fighting GalleryDesignPanel / Delivery (one UI owns it; others deep-link).

- [x] **AURA-333** · P1 · Settings · Contact on website  
  Contact form on/off + prefs deep-link to Notifications/Contact (Phase 19 AURA-310).

### S5 — Delivery defaults (studio-wide)

- [x] **AURA-334** · P1 · Settings · Delivery defaults section  
  Default watermark preset, default gallery theme/grid/cover style, comments on/off default, **expiry days** (replace hardcoded 60), select-limit default, download PIN policy default. New galleries inherit; per-gallery overrides remain in Delivery.

- [x] **AURA-335** · P1 · Settings · Watermarks under Delivery  
  Move watermark CRUD into Delivery defaults (or Library → Watermarks linked from here). Scale editable if product wants it (today fixed `0.14`).

### S6 — Booking setup

- [x] **AURA-336** · P1 · Settings · Booking section  
  Public book URL (from slug), showBooking, buffer defaults, deep-link/manage **session types** (name, duration, price, deposit, questionnaire). Ops inbox stays on `/admin/bookings`.

- [x] **AURA-337** · P2 · Settings · Session-type buffer UI  
  Wire unused `bufferMinutes` (or equivalent) into editable fields + calendar freeBusy.

### S7 — Payments setup

- [x] **AURA-338** · P1 · Settings · Payments section  
  Stripe Connect status, onboard/manage (move primary setup from Payments page; ledger stays on `/admin/payments`). Currency: USD-only declaration or multi-currency plan (AURA-123).

- [x] **AURA-339** · P2 · Settings · Default payment / deposit templates  
  Default deposit % or link templates for new projects — deep-link payment link library if kept on Payments.

### S8 — Notifications & contact

- [x] **AURA-340** · P1 · Settings · Notifications section  
  All studio + client email toggles with **own Save**. No Resend/Firebase narration (AURA-085). Group: “Email me when…” / “Email clients when…”.

- [x] **AURA-341** · P1 · Settings · Contact delivery prefs  
  Recipient address, homepage/gallery form toggles, optional auto-reply (AURA-310). Same section or adjacent subsection.

### S9 — Integrations hub

- [x] **AURA-342** · P1 · Settings · Integrations section  
  Google Calendar connect/disconnect/refresh + Stripe Connect status (deep-link). Bookings calendar shows status + “Manage in Settings” — not a second Connect UI.

- [x] **AURA-343** · P2 · Settings · Integration health  
  Last sync / error visible when GCal or Connect fails (pairs observability DoD).

### S10 — Library (templates index)

- [x] **AURA-344** · P1 · Settings · Library section  
  Index cards linking Contracts, Questionnaires, Quote packages, Shot lists, Watermarks — reduce scavenger hunt across Documents/Prep/Packages. Ops send flows stay on Documents/Projects.

- [x] **AURA-345** · P2 · Settings · Legal defaults pointer  
  Default cancel policy / contract template for new sends — clarify vs package `contractTerms` vs Documents templates (one recommended default).

### S11 — Team, data, danger

- [x] **AURA-346** · P2 · Settings · Team section  
  Honest single-owner UI **or** roles (AURA-121) — no teasing empty membership.

- [x] **AURA-347** · P2 · Settings · Data export  
  Export studio profile + projects/sessions metadata (and guidance for media) — calm, not a dump of secrets.

- [x] **AURA-348** · P2 · Settings · Danger zone  
  Disconnect integrations, disable homepage, delete studio — ConfirmProvider + consequence copy.

### S12 — Unify & cutover

- [x] **AURA-349** · P1 · Architecture · Single Settings write contracts
  Document which PATCH bodies each section uses; stop silent multi-section saves. Prefer per-section API or explicit `section` keys — no full-studio RMW for a checkbox (perf bar).

- [x] **AURA-350** · P1 · UX · Deep-links from ops hubs  
  Payments → Settings/Payments; Bookings → Settings/Booking; Delivery “studio default” → Settings/Delivery; Documents → Settings/Library.

- [x] **AURA-351** · P1 · Copy · Settings language
  Project/Session terminology; sparse labels; no infra product names in prefs copy.

- [x] **AURA-352** · P2 · DoD · Settings completeness  
  Every `Studio` field with product meaning is editable or explicitly read-only with reason; no orphan API-only brand/profile fields.

- [x] **AURA-353** · P1 · DoD · Photographer can tailor the company  
  From Settings alone: brand, business profile, website on/off, delivery defaults, booking types entry, Connect, notifications, calendar — without hunting Payments/Documents/mega-page soup. 375px usable.

---

## Completion log


| ID           | Completed  | Notes                                                                                                      |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------- |
| AURA-354     | 2026-07-28 | MediaStore + R2/Firebase backends; upload path wired                                                       |
| —            | 2026-07-28 | Canonical execution waves W0–W14; Phase 0b R2 after W0; AURA-151 superseded                                |
| AURA-001     | 2026-07-28 | coerceProject keeps workflowStep + cancelToken; projectRoundTripPreserved                                  |
| AURA-152     | 2026-07-28 | coerceSession hardened; shoots PATCH endsAt/proposalId/galleryId/googleEventId/intakeAnswers               |
| AURA-002     | 2026-07-28 | upsert-only collection writes; deleteStudioDocs + per-doc helpers; hot path migrations                     |
| AURA-003     | 2026-07-28 | recordEvent → appendStudioDoc (no full-studio RMW on views)                                                |
| AURA-004     | 2026-07-28 | Public pay fail-closed; no local fake payment when Connect/Stripe missing                                  |
| AURA-005     | 2026-07-29 | Per-visitor gallery favorites (cookie + galleryFavorites); no shared hearts                                |
| AURA-006     | 2026-07-29 | Public token gates: draft gallery/quote admin-preview only; accept only when sent                          |
| AURA-007     | 2026-07-29 | GCal getBusyIntervals fail-closed on refresh/freeBusy errors (no empty=free)                               |
| AURA-008     | 2026-07-29 | Sub-album public API resolves photo URLs via resolveBrowseMediaUrl                                         |
| AURA-358     | 2026-07-29 | R2 smoke PASS; apphosting.yaml + secrets granted to backend aura                                           |
| AURA-355     | 2026-07-29 | PIN download returns signed URLs (no App Hosting original buffer)                                          |
| AURA-356     | 2026-07-29 | Client-side zip from signed URLs; R2 CORS via dashboard (token no Admin)                                   |
| AURA-357     | 2026-07-29 | Public browse uses R2 signed URLs for thumb/web (resolveBrowseMediaUrl)                                    |
| AURA-359     | 2026-07-29 | Migrated 72 studios/** objects Firebase→R2 (verified); FB kept for dual-read                               |
| AURA-360     | 2026-07-29 | Prod requires R2 for media writes; Firebase write path retired; dual-read optional                         |
| AURA-362     | 2026-07-29 | DoD: signed downloads + client zip + /api/media 302→R2; W1 closed (361 optional)                           |
| AURA-009     | 2026-07-29 | Webhook records amounts from session.amount_total, not metadata                                            |
| AURA-010     | 2026-07-29 | Payment tx idempotent on CS/PI; no double paidAmount on webhook retry                                      |
| AURA-011     | 2026-07-29 | Webhook no longer re-writes stage/workflow; recordPaymentLinkCharge sole writer                            |
| AURA-012     | 2026-07-29 | Payments empty→project Deposit; Deposits list + cross-links both ways                                      |
| AURA-013     | 2026-07-29 | Quiet Enable/Manage payments strip; no Connect product narration                                           |
| AURA-014     | 2026-07-29 | Pay page cancel/pending; client fee preview; success amount+studio                                         |
| AURA-015     | 2026-07-29 | Documented fee estimate limits; USD-only currency seam in stripe-fees                                      |
| AURA-016     | 2026-07-29 | Webhook refund/dispute/async-fail rollback; paid-only record; dispute won restore                          |
| AURA-017     | 2026-07-29 | Continuous Book→handoff→Session spine; prep gated until deposit                                            |
| AURA-018     | 2026-07-29 | Workflow advance/reopen; readiness-based done badges                                                       |
| AURA-019     | 2026-07-29 | Confirm booking → project #workflow with next-step toast                                                   |
| AURA-020     | 2026-07-29 | createSession asks before prep when book steps incomplete                                                  |
| AURA-021     | 2026-07-29 | Bookings split into Requests / Calendar / Session types tabs                                               |
| AURA-022     | 2026-07-29 | Session type archive/restore; public book only active types                                                |
| AURA-023     | 2026-07-29 | Book form min/tz/pending + pre-submit availability check                                                   |
| AURA-024     | 2026-07-29 | Public book API no longer returns projectHref or booking payload                                           |
| AURA-025     | 2026-07-29 | Confirm surfaces calendarPushFailed; decline/cancel/delete remove GCal; PATCH reschedule updates           |
| AURA-026     | 2026-07-29 | Real per-studio OAuth only (no stub); session create/edit/delete syncs GCal; redact refresh token          |
| AURA-027     | 2026-07-29 | Quote accept → contract/deposit next + links when present; admin Continue with Contract                    |
| AURA-028     | 2026-07-29 | Mark accepted confirm: skips client accept; unlocks Contract then Deposit                                  |
| AURA-029     | 2026-07-29 | Project balance pay link (quote−paid); Workflow Delivery step Create/Copy/Email                            |
| AURA-030     | 2026-07-29 | Wrap Mark delivered → session/project state; invoice + homepage reminders; archive → completed             |
| AURA-031     | 2026-07-29 | Scrim/on-media tokens; galleryThemeCssVars parity + accent-ink; lightbox/hero/tiles use scrim              |
| AURA-032     | 2026-07-29 | Gallery theme vars on peek + sub-album; fontPreset on gallery + homepage                                   |
| AURA-033     | 2026-07-29 | Public proposal mood-board URLs resolveBrowseMediaUrls                                                     |
| AURA-034     | 2026-07-29 | Public quote/favorite/comments/peek/sub-album error states + toasts                                        |
| AURA-035     | 2026-07-29 | Gallery chrome + tile actions ≥44px; labels on small screens; hover optional                               |
| AURA-036     | 2026-07-29 | Share album vs Share photo labels; dialog copy for selection share                                         |
| AURA-037     | 2026-07-29 | Download ext from original; skip/video honesty; single video allowed                                       |
| AURA-038     | 2026-07-29 | PublicShell + StudioMark on q/cancel/pay/book/homepage gate                                                |
| AURA-039     | 2026-07-29 | Homepage password via POST (not query); wrong-password feedback                                            |
| AURA-040     | 2026-07-29 | Contract acknowledge: neutral “agree to terms” (no hardcoded clauses)                                      |
| AURA-041     | 2026-07-29 | Escape all interpolated strings in HTML emails (wrapHtml + bodies)                                         |
| AURA-042     | 2026-07-29 | Single sticky chrome (AlbumView non-sticky under gallery); nav wraps 375px                                 |
| AURA-043     | 2026-07-29 | Gallery/studio manifest theme/background/name from brand; apple title                                      |
| AURA-044     | 2026-07-29 | Sticky mobile Sign CTA on contract; safe-area bottom                                                       |
| AURA-045     | 2026-07-29 | Sub-album back-to-gallery link; errors already honest (034)                                                |
| AURA-046     | 2026-07-29 | Expired gallery: studio name + mailto next step                                                            |
| AURA-047     | 2026-07-29 | Questionnaire: view answers after submit; block zero-question submit                                       |
| AURA-048     | 2026-07-29 | “Secures your date” only for deposit links; stable idempotency keys                                        |
| AURA-049     | 2026-07-29 | Expired gallery API: no photo/cover URLs (photos: [])                                                      |
| AURA-050     | 2026-07-29 | PublicSuccess shared grammar on quote/pay/book/q/cancel                                                    |
| AURA-364     | 2026-07-29 | Chunked signed-URL batches (30); per-chunk skipped honesty; W4 closed                                      |
| AURA-051     | 2026-07-29 | Dashboard/Analytics loading→error+retry on !res.ok                                                         |
| AURA-052     | 2026-07-29 | Project sessions: parallel wizard fetches (Promise.all) not sequential                                     |
| AURA-053     | 2026-07-29 | Projects/Payments/Documents/Settings: loading state before empty flash                                     |
| AURA-365     | 2026-07-29 | Stripe Checkout Idempotency-Key on public pay                                                              |
| AURA-054     | 2026-07-29 | Project detail: 15s timeout + error/retry (no infinite Loading)                                            |
| AURA-055     | 2026-07-30 | updateStudioDb skips photos/analytics by default; scoped gallery photo helpers; upsert-safe persist          |
| AURA-055     | 2026-07-29 | Reverted unsafe lazy-load; blocked — do not half-migrate (needs 188)                                       |
| AURA-056     | 2026-07-29 | Workflow loadRelated: toast on failed subfetch (not fake empty)                                            |
| AURA-057     | 2026-07-29 | beforeunload guard on Settings/Documents/Packages editors                                                  |
| AURA-367     | 2026-07-29 | Projects list: null-safe email filter; W5 closed                                                           |
| AURA-366     | 2026-07-29 | Archive: signed URLs + client-side zip (no App Hosting buffer)                                             |
| AURA-073     | 2026-07-29 | Delivery: expiry extend/expire + select-limit in Settings                                                  |
| AURA-074     | 2026-07-29 | Delivery header: Copy link + Email link (gallery live email)                                               |
| AURA-075     | 2026-07-29 | Delivery photo select/delete ≥44px; focus-within for keyboard                                              |
| AURA-076     | 2026-07-29 | Create gallery: PIN shown + copied before navigate                                                         |
| AURA-077     | 2026-07-29 | Video: no fake 1920×1080; “Download via single” hint on tile                                               |
| AURA-078     | 2026-07-29 | Sharp fail on watermarked gallery → 503/flag; no silent unprotected wm                                     |
| AURA-079     | 2026-07-29 | Prep: confirm before force-refresh wipes checked progress                                                  |
| AURA-080     | 2026-07-29 | Dashboard: expired galleries section with admin delivery links                                             |
| AURA-081     | 2026-07-29 | Awaiting quotes: Continue workflow + Preview links; W6 closed                                              |
| AURA-153     | 2026-07-29 | Restore store helpers (delete/append/patch/updateDoc); merge rules test; doc comment                       |
| AURA-154     | 2026-07-29 | Documented: dual-write only on full persist; hot paths bypass via 002/003                                  |
| AURA-155     | 2026-07-29 | /api/projects + [id] CRUD with project/sessions only                                                       |
| AURA-156     | 2026-07-29 | /api/sessions + [id] CRUD with projectId/startsAt only                                                     |
| AURA-157     | 2026-07-29 | /api/quotes alias; POST accepts sessionId; responses quote/proposal                                        |
| AURA-158     | 2026-07-29 | Gallery POST accepts sessionId; “Session not found” error                                                  |
| AURA-159     | 2026-07-29 | getProjectBundle/getSessionBundle aliases in store                                                         |
| AURA-160     | 2026-07-29 | Wizard payload: project/session keys (client/shoot optional in hook)                                       |
| AURA-161     | 2026-07-29 | Project GET returns session summaries; FE uses them (no N+1 wizard)                                        |
| AURA-162     | 2026-07-29 | Projects list/detail → /api/projects; no project/client/shoot                                              |
| AURA-163     | 2026-07-29 | Session create/delete → /api/sessions; projectId/startsAt                                                  |
| AURA-164     | 2026-07-29 | Payments/Documents/Analytics pickers → projects/sessions; analytics sessionId                              |
| AURA-165     | 2026-07-29 | Session wizard + hook: canonical project/session only (no                                                  |
| AURA-166     | 2026-07-29 | Public gallery/proposal/cancel/contract JSON: projectName + clientName dual-read                           |
| AURA-167     | 2026-07-29 | loadStudioDatabase: skip clients/shoots scan when canonical non-empty                                      |
| AURA-168     | 2026-07-29 | persistStudioDatabase: no dual-write clients/shoots; single source                                         |
| AURA-169     | 2026-07-29 | Gallery/quote create: sessionId only (no shootId mirror on new writes)                                     |
| AURA-170     | 2026-07-29 | SessionStatus/SessionPlan canonical; ShootStatus/ShootPlan deprecated aliases                              |
| AURA-171     | 2026-07-29 | COL.sessions documented as auth cookies (not projectSessions)                                              |
| AURA-172     | 2026-07-29 | GET /api/projects/[id]/workflow: server-computed statusByStep                                              |
| AURA-173     | 2026-07-29 | state-rules.ts + markGalleryLive applies project side effects                                              |
| AURA-174     | 2026-07-29 | /api/projects + /api/clients POST: cancelToken on create                                                   |
| AURA-175     | 2026-07-29 | intake-answers.ts: session.intakeAnswers canonical; quote accept syncs                                     |
| AURA-176     | 2026-07-29 | Helper: server plan only; removed localStorage cache; reload on save fail                                  |
| AURA-177     | 2026-07-29 | deriveWizardProgress: intake done = intakeAnswers (not session.type)                                       |
| AURA-178     | 2026-07-29 | SessionRow: startsAt only (no shootDate remap)                                                             |
| AURA-179     | 2026-07-29 | archiveFlags wired (080); projectDate vs startsAt documented                                               |
| AURA-180     | 2026-07-29 | zod schemas for project/session/gallery/quote create-update                                                |
| AURA-181     | 2026-07-29 | Project create: name only; email optional (required on send)                                               |
| AURA-182     | 2026-07-29 | Session startsAt: normalize date-only → ISO; reject ambiguous                                              |
| AURA-183     | 2026-07-29 | PIN parity: 4-digit rule shared (pin.ts, schemas, UI, server)                                              |
| AURA-184     | 2026-07-29 | Quote POST: sessionId (or shootId); “Session not found” errors                                             |
| AURA-185     | 2026-07-29 | Quote POST: 409 unless replace: true when session has quote                                                |
| AURA-186     | 2026-07-29 | Plan route: Session not found; gallery create error uses sessionId                                         |
| AURA-187     | 2026-07-29 | type-systems.ts: project/session/shot-list/booking type map                                                |
| AURA-188     | 2026-07-29 | /api/projects/[id]/related; workflow panel uses it (one fetch)                                             |
| AURA-191     | 2026-07-29 | quotes GET ?projectId= filter                                                                              |
| AURA-192     | 2026-07-29 | Deleted orphan IntakeStep/QuoteStep (no imports)                                                           |
| AURA-193     | 2026-07-29 | Dashboard helperHref → /admin/projects/.../sessions/...?step=shoot-day                                     |
| AURA-194     | 2026-07-29 | PUBLIC_ROUTES.md noun map                                                                                  |
| AURA-195     | 2026-07-29 | recordEvent: sessionId+projectId on gallery/download/photo-view/favorites/subalbum                         |
| AURA-196     | 2026-07-29 | Analytics: projectId param; money joins via projectIdFilter                                                |
| AURA-197     | 2026-07-29 | clients/shoots removed from TENANT_COLLECTIONS; W7 closed                                                  |
| AURA-198     | 2026-07-29 | ADR-dual-model-retirement.md                                                                               |
| AURA-199     | 2026-07-29 | normalize tests: field preservation + alias shapes                                                         |
| AURA-201     | 2026-07-29 | @theme: text/space/z/duration tokens mapped                                                                |
| AURA-202     | 2026-07-29 | Theme helpers on gallery/peek/sub-album/homepage; no ad-hoc hex on gates                                   |
| AURA-203     | 2026-07-29 | ButtonLink primitive; ShootPublicLinks uses it                                                             |
| AURA-204     | 2026-07-29 | ThemeSwatch primitive; Settings + GalleryDesignPanel use it                                                |
| AURA-205     | 2026-07-29 | SegmentedControl; cover style + photo layout use it                                                        |
| AURA-206     | 2026-07-29 | List/ListRow primitives; dashboard uses them                                                               |
| AURA-207     | 2026-07-29 | MetricTile; dashboard counts + analytics financials/engagement                                             |
| AURA-208     | 2026-07-29 | Panel static/interactive/dashed; dashboard, payments, bookings, calendar                                   |
| AURA-209     | 2026-07-29 | EmptyState centered/inline/loading/error; admin load/error/empty paths                                     |
| AURA-210     | 2026-07-29 | Button onMedia + PublicCta; GalleryHero + cover-none View gallery                                          |
| AURA-211     | 2026-07-29 | PublicShell on /g peek /s + homepage body; style/className; bare full-bleed                                |
| AURA-212     | 2026-07-29 | ShootDay + helper shot preview → Dialog; Dialog scrim token                                                |
| AURA-363     | 2026-07-29 | Dialog portals to document.body; body scroll lock; Confirm/upload inherit                                  |
| AURA-213     | 2026-07-29 | fontPresetCssVars; studio/gallery theme helpers; homepage/book/quote/gallery                               |
| AURA-214     | 2026-07-29 | radius-device + shadow-on-media tokens; retire arbitrary rounded/drop-shadow                               |
| AURA-215     | 2026-07-29 | Tabs progress variant; ShootWizardShell uses it; mobile step jump                                          |
| AURA-067     | 2026-07-29 | Mobile wizard step jump via Tabs progress Select (with 215)                                                |
| AURA-216     | 2026-07-29 | StatusBadge maps; projects/sessions/bookings/payments                                                      |
| AURA-217     | 2026-07-29 | IconButton label+active; GalleryNavItem/TileAction compose it                                              |
| AURA-218     | 2026-07-29 | --public-max 87.5rem; gallery/PublicShell/quote/AlbumView                                                  |
| AURA-219     | 2026-07-29 | Chip primitive; SessionsCalendar EventChip uses status tones                                               |
| AURA-220     | 2026-07-29 | duration-enter/emphasis/crossfade; hero/grid/lightbox; reduced-motion                                      |
| AURA-221     | 2026-07-29 | aura-unified-ui.mdc enforcement + primitive inventory; W8 closed                                           |
| AURA-317     | 2026-07-29 | SettingsShell + routed sections; /admin/settings → last or studio; closed 070                              |
| AURA-318     | 2026-07-29 | Per-section PATCH + dirty guard (studio/homepage/notifications); watermarks own save                       |
| AURA-319     | 2026-07-29 | Settings overview checklist; /admin/settings → last or overview                                            |
| AURA-320     | 2026-07-29 | Settings 375px: address stack, form rows, touch targets; closed 087                                        |
| AURA-321     | 2026-07-29 | Account section: owner email, first/last name PATCH, logout; studio email note                             |
| AURA-322     | 2026-07-29 | Account password change; list devices + sign out others via /api/auth/sessions                             |
| AURA-323     | 2026-07-29 | Brand section: name/tagline/logos/theme/social; cover upload; closed 091                                   |
| AURA-324     | 2026-07-29 | Brand typography: FONT_PRESETS + SegmentedControl; font override on theme save                             |
| AURA-325     | 2026-07-29 | defaultCoverImageUrl upload (kind=og); OG meta on /h and /book                                             |
| AURA-326     | 2026-07-29 | Admin PWA from Brand kit (manifest icon/name/colors + theme-color); Brand note                             |
| AURA-327     | 2026-07-29 | Business section: phone/website/address+country/print partners; addressLine2 PATCH                         |
| AURA-328     | 2026-07-30 | IANA time zone Select + API validation; closed 090                                                         |
| AURA-329     | 2026-07-30 | Date format preview in studio TZ; curated formats + API guard                                              |
| AURA-330     | 2026-07-30 | Website settings shell (was Homepage); password gate copy; Switch/Checkbox                                 |
| AURA-331     | 2026-07-30 | `/admin/website` builder entry; Publish/Draft; live themed 375px preview; closed 098                       |
| AURA-098     | 2026-07-30 | Closed with 331 — production renderer preview, not wireframe                                               |
| AURA-332     | 2026-07-30 | Featured collections owned by Website settings; Design/Wrap deep-link only                                 |
| AURA-333     | 2026-07-30 | Website showContactForm + Notifications Contact deep-link (recipient stub)                                 |
| AURA-334     | 2026-07-30 | Delivery defaults section; expiryDays replaces hardcoded 60; galleries inherit                             |
| AURA-335     | 2026-07-30 | Watermark CRUD under Delivery; editable scale 5–50%; /watermarks redirects                                 |
| AURA-336     | 2026-07-30 | Booking settings: book URL, showBooking, buffer default, session types; inbox stays                        |
| AURA-337     | 2026-07-30 | Session-type buffer create/edit UI; clamped; already used in freeBusy checks                               |
| AURA-338     | 2026-07-30 | Settings Payments: Connect onboard/manage/disconnect; USD-only; ledger deep-link                           |
| AURA-339     | 2026-07-30 | paymentDefaults (deposit $ + link title); deposit API + form prefills; library stays on /admin/payments    |
| AURA-340     | 2026-07-30 | SettingsNotifications: Email me / Email clients Switch groups; own Save; Contact stub kept for 341         |
| AURA-341     | 2026-07-30 | contactPrefs: recipient, website/gallery form toggles, auto-reply; Save contact; helpers for W11           |
| AURA-342     | 2026-07-30 | SettingsIntegrations: GCal connect/refresh/disconnect; Stripe status→Payments; calendar Manage in Settings |
| AURA-343     | 2026-07-30 | GCal/Stripe last sync+error persisted; Integrations Check status; no freeBusy RMW                          |
| AURA-344     | 2026-07-30 | Settings Library index: contracts/questionnaires/packages/shot lists/watermarks + counts                   |
| AURA-345     | 2026-07-30 | legalDefaults default contract template; cancel via template; quote terms clarified                        |
| AURA-346     | 2026-07-30 | Settings Team: honest single-owner row; no invite/roles tease                                              |
| AURA-347     | 2026-07-30 | GET /api/studio/export JSON; no secrets/media bytes; Settings Data download                                |
| AURA-348     | 2026-07-30 | Data danger zone: disconnect GCal/Stripe, disable site, delete studio (O(studio))                          |
| AURA-349     | 2026-07-30 | Settings PATCH requires `section`; whitelist + studio-doc RMW; clients wired                               |
| AURA-350     | 2026-07-30 | Ops hubs → Settings: Booking/Library headers; Delivery studio-default link                                 |
| AURA-351     | 2026-07-30 | Settings copy: contacts not clients; drop fluff/limitation narration                                       |
| AURA-352     | 2026-07-30 | ownerEmail read-only reason; clear logo/cover/share in Brand                                               |
| AURA-353     | 2026-07-30 | Overview covers full company-tailor checklist; W9 Settings OS closed                                       |
| AURA-222     | 2026-07-30 | StudioBrandKit persist + Brand UI; presets as starting kits; legacy mirrors                                |
| AURA-223     | 2026-07-30 | homepage.modules schema + migrate-from-toggles; unknown types dropped                                      |
| AURA-224     | 2026-07-30 | HomepageModuleList renderer; payload includes modules; shared /h + preview                                 |
| AURA-225     | 2026-07-30 | Site builder: module reorder/toggle, Save modules vs Publish, 375px preview                                |
| AURA-226     | 2026-07-30 | Draft vs live copy; /admin/website/preview; save toasts (draft vs live)                                    |
| AURA-227     | 2026-07-30 | homepageSlugs index + listGalleriesForStudio; no full-DB /h load                                           |
| AURA-228     | 2026-07-30 | Type kits (editorial/modern/soft + legacy); TypePairingSwatch; root fonts                                  |
| AURA-229     | 2026-07-30 | Site layouts Editorial/Minimal/Portfolio/Bold; modules+brand apply in builder                              |
| AURA-230     | 2026-07-30 | Hero variants fullBleed/split/type/lockup; coverImageUrl; PublicCta href                                   |
| AURA-231     | 2026-07-30 | Collections masonry/grid/list/cinematic; HomepageCollections + fade affordance                             |
| AURA-232     | 2026-07-30 | Booking CTA: ready only with slug+types; admin empty states; no dead public CTA                            |
| AURA-233     | 2026-07-30 | Contact: mailto/tel/maps; address lines; SocialLinks text/icons/pills                                      |
| AURA-234     | 2026-07-30 | Homepage unlock cookie + branded Private site gate; POST returns payload                                   |
| AURA-235     | 2026-07-30 | Share meta from brand kit; Website settings share-card preview                                             |
| AURA-236     | 2026-07-30 | Site checklist (logo/modules/reach/theme); hidden when complete                                            |
| AURA-237     | 2026-07-30 | Homepage cover thumb+wm srcset via derivative path rewrite; O(galleries)                                   |
| AURA-238     | 2026-07-30 | Documented custom domain as future (`docs/CUSTOM_DOMAIN.md`); /h/{slug} only                               |
| AURA-239     | 2026-07-30 | Gallery design v2 modules + flat mirrors; normalize/patch on read & API                                    |
| AURA-240     | 2026-07-30 | Design preset packages fill full schema; apply on swatch + gallery create                                  |
| AURA-241     | 2026-07-30 | GalleryHero from cover module (layout/type/CTA/scrim); no themeId JSX                                      |
| AURA-242     | 2026-07-30 | Gallery designer: 375px frame, module tabs, undo, reset-to-preset                                          |
| AURA-243     | 2026-07-30 | Gallery design PATCH via updateStudioDoc; RMW only for live/watermark                                      |
| AURA-244     | 2026-07-30 | Cover treatments library + focal grid; immersive/split-title in hero                                       |
| AURA-245     | 2026-07-30 | GalleryChrome: sticky/floating/bottom-bar/branded + logo; safe-area pad                                    |
| AURA-246     | 2026-07-30 | Shared MediaGrid engine; diary mode; homepage + gallery; token enter                                       |
| AURA-247     | 2026-07-30 | AlbumNav + backHref; /s download inherits parent PIN via photoIds                                          |
| AURA-248     | 2026-07-30 | Selects X of Y + submit lock; Wrap review; 122 superseded                                                  |
| AURA-249     | 2026-07-30 | Download copy + PIN errors; confirm when no PIN; empty/video honesty                                       |
| AURA-250     | 2026-07-30 | GalleryGuestState + soft draft/archived; 20s load retry; thumb-bar chrome                                  |
| AURA-251     | 2026-07-30 | brandSource studio                                                                                         |
| AURA-252     | 2026-07-30 | density compact/comfortable/airy; motion calm/cinematic via shell data-*                                   |
| AURA-253     | 2026-07-30 | PhotoLightbox portal+focus trap; filename caption; surface footer comments                                 |
| AURA-254     | 2026-07-30 | GalleryCoachTips first-visit card; design.coach.enabled; localStorage dismiss                              |
| AURA-255     | 2026-07-30 | DeliveryPublishChecklist + delivery-publish; PIN scroll; email stamps clientEmailedAt                      |
| AURA-256     | 2026-07-30 | Public gallery GET scoped (no readStudioDb); photo pages + progressive /g load                             |
| AURA-257     | 2026-07-30 | Lightbox ←/→/Home/End; view aria-live; tile labels; OS reduced-motion                                      |
| AURA-258     | 2026-07-30 | Per-gallery manifest 192/512/maskable + theme-color; design app icon upload                                |
| AURA-259     | 2026-07-30 | GalleryPrintPartners quiet CTA; publicPrintPartners filter; W10 closed                                     |
| AURA-304     | 2026-07-30 | ContactStudio + HomepageContactForm; honeypot; submitPublicContact stub                                    |
| AURA-305     | 2026-07-30 | POST /api/public/contact; contactMessages append; IP/studio rate limits; prefs gate                        |
| AURA-306     | 2026-07-30 | emailContactToStudio Resend + replyTo; fail→502; emailStatus sent/failed                                   |
| AURA-307     | 2026-07-30 | Homepage Contact: form primary on showEmail/form; Email/Call secondary                                     |
| AURA-308     | 2026-07-30 | Gallery Message chrome+dialog; guest/expired form; galleryToken context                                    |
| AURA-309     | 2026-07-30 | Soft-failure Message on book/quote/pay; proposalToken+paymentLinkId resolve                                |
| AURA-311     | 2026-07-30 | emailContactMessage pref; bell→/admin#messages; dashboard Messages list                                    |
| AURA-312     | 2026-07-30 | 24KiB body cap; startedAt time-trap; email RL; harden strip; no CAPTCHA                                    |
| AURA-313     | 2026-07-30 | contact emailOutbox+backoff; accept on Resend fail; cron/dashboard drain; 149 open                         |
| AURA-314     | 2026-07-30 | emailContactAutoReply via contactPrefs.autoReply*; non-fatal on fail                                       |
| AURA-315     | 2026-07-30 | /api/webhooks/resend verify+sanitize; slug                                                                 |
| AURA-316     | 2026-07-30 | DoD: homepage API matches showEmail/form; Message on /s + peek; W11 MVP closed                             |
| AURA-371–374 | 2026-07-30 | Backlog: project inbound Reply-To + Messages trail (no compose)                                            |
| AURA-371     | 2026-07-30 | p-/sess- inbound route; ContactMessage projectId/sessionId; notify→project                                 |
| AURA-372     | 2026-07-30 | clientTransactionalReplyTo; quote/gallery/book/contract/pay Reply-To→p-                                    |
| AURA-373     | 2026-07-30 | ProjectMessagesTrail + GET …/messages; dashboard Project link; #messages                                   |
| AURA-374     | 2026-07-30 | POST …/messages Send reply; emailProjectClientReply; Reply-To=p-; trail note                               |
| AURA-281     | 2026-07-30 | viewportFit=cover; Admin/PublicShell + toast/login/gallery/contract safe-area                              |
| AURA-282     | 2026-07-30 | Button/Link sm≥44px; dashboard/bookings links; calendar chips non-link; menu scroll                        |
| AURA-283     | 2026-07-30 | Public 375: clip H-scroll; homepage/gallery split+vertical; quote/contract; 379 closed                     |
| AURA-379     | 2026-07-30 | Closed with 283 — bare public safe-area residuals                                                          |
| AURA-284     | 2026-07-30 | Sticky wizard nav; workflow mobile focus; Delivery embedded designer chrome                                |
| AURA-285     | 2026-07-30 | DeviceFramePreview 375/scale + Phone/Desktop; site builder preview-first                                   |
| AURA-286     | 2026-07-30 | roomy/short-vh; gallery chrome+lightbox+contract+hero landscape                                            |
| AURA-287     | 2026-07-30 | App density tokens; SegmentedControl/ShootDay/StringList/PageHeader                                        |
| AURA-088     | 2026-07-30 | ActionStack primary+More; workflow farms + Delivery header                                                 |
| AURA-089     | 2026-07-30 | Calendar month phone: compact grid + agenda; chips from md                                                 |
| AURA-375     | 2026-07-30 | Switch/Checkbox ≥44px hit; visual track/box unchanged                                                      |
| AURA-376     | 2026-07-30 | Admin touch: mailto/helper links; prep rows; Checkbox migrate                                              |
| AURA-377     | 2026-07-30 | ScrollRail edge fades; helper / AlbumNav / cinematic                                                       |
| AURA-378     | 2026-07-30 | Gallery phone chrome: icon thumb bar, AlbumView budget, safe chevrons                                      |
| AURA-380     | 2026-07-30 | Dialog max-h + internal scroll; drop 85vh workarounds                                                      |
| AURA-381     | 2026-07-30 | --admin-sticky-top under AdminShell; GalleryDesignPanel                                                    |
| AURA-382     | 2026-07-30 | Cancel soft-fail Message via cancelToken contact resolve                                                   |
| AURA-383     | 2026-07-30 | Gallery designer modules: Tabs progress below md                                                           |
| AURA-288     | 2026-07-30 | Manifest matrix: admin / gallery / h / book scopes                                                         |
| AURA-289     | 2026-07-30 | PWA icons: /api/pwa-icon PNG + maskable; static Aura marks                                                 |
| AURA-290     | 2026-07-30 | SW v3 strategy doc; API no-cache; offline.html; controlled activate                                        |
| AURA-291     | 2026-07-30 | OfflineStatus toasts; gallery/helper mutation honesty                                                      |
| AURA-368     | 2026-07-30 | SW per-surface scope; v4 R2/signed media never cached                                                      |
| AURA-292     | 2026-07-30 | Standalone detect; Account/Log out in shell; .browser-only                                                 |
| AURA-293     | 2026-07-30 | InstallHint admin+gallery; iOS Share one-liner; dismissible                                                |
| AURA-294     | 2026-07-30 | safeAdminNext + expiry→login?next; logout cookie path                                                      |
| AURA-385     | 2026-07-30 | PWA stay signed in: Response Set-Cookie, IndexedDB Auth, silent restore, clientLogout                      |
| AURA-295     | 2026-07-30 | theme-color = kit background; statusBar + Brand refresh                                                    |
| AURA-296     | 2026-07-30 | Admin last-route resume; launch_handler; hash-safe next                                                    |
| AURA-297     | 2026-07-30 | Gallery launch_handler; standalone downloadSignedUrl                                                       |
| AURA-298     | 2026-07-30 | Homepage/book InstallHint + preferExistingWindow                                                           |
| AURA-299     | 2026-07-30 | Quote/contract/pay PWA chrome; no SW                                                                       |
| AURA-300     | 2026-07-30 | SW media cache 48MiB thumbs/previews only                                                                  |
| AURA-301     | 2026-07-30 | DoD: responsive gate — 283–287, 088/089, 375–383 closed                                                    |
| AURA-302     | 2026-07-30 | DoD: PWA installable — 288–300 + 368 closed                                                                |
| AURA-303     | 2026-07-30 | DoD: responsive+PWA rules peer to unified-ui; W12 closed                                                   |
| AURA-260     | 2026-07-30 | Dashboard first-project checklist; projects ?new=1 empty CTA                                               |
| AURA-261     | 2026-07-30 | Single spine plain labels; no Book/Session split headers                                                   |
| AURA-262     | 2026-07-30 | Destructive confirms + shared consequence copy; go live gated                                              |
| AURA-263     | 2026-07-30 | Deep links: notify/dashboard/analytics → workflow/delivery                                                 |
| AURA-264     | 2026-07-30 | mutateJson; no false-success toasts; settings/upload offline honesty                                       |
| AURA-266     | 2026-07-30 | Sparse admin help; PageHeader essays cut; Session types ButtonLinks                                        |
| AURA-267     | 2026-07-30 | Parallel uploads (3); progress/timeouts; atomic sortOrder/cover on complete                                |
| AURA-268     | 2026-07-30 | Admin list pagination + scoped reads; Load more; strip contract bodies                                     |
| AURA-269     | 2026-07-30 | Idempotency-Key on quote/contract/pay email; singleflight + 15m replay                                     |
| AURA-270     | 2026-07-30 | Public rate limits + append/patch writes; no public full-studio RMW                                        |
| AURA-271     | 2026-07-30 | DoD data honesty verified; draft contract tokens gated like gallery/quote                                  |
| AURA-272     | 2026-07-30 | DoD persist: public per-entity writes; upsert-only; multi-instance wipe-safe; 107 deferred                 |
| AURA-273     | 2026-07-30 | Domain language: sessions plan/wizard/wrap; FE cutover; legacy flag; Deprecation headers                   |
| AURA-274     | 2026-07-30 | DoD unified UI; PublicShell/primitives verified; helper+ShootDay off ad-hoc; closed 082/083                |
| AURA-275     | 2026-07-30 | DoD website builder MVP verified; Settings defers layout to Site builder                                   |
| AURA-276     | 2026-07-30 | DoD gallery designer MVP verified (schema/presets/hero/chrome/grid/checklist)                              |
| AURA-277     | 2026-07-30 | Happy-path DoD; deposit/contract workflow advance rules (119/120); closed 118                               |
| AURA-102     | 2026-07-30 | Rename cascade: auto titles + opt-in custom; Balance titles included                                       |
| AURA-103     | 2026-07-30 | Archive vs delete copy: live links on project archive; Wrap export before delete                           |
| AURA-104     | 2026-07-30 | Signed session cookie; middleware HMAC verify; layout still authoritative                                  |
| AURA-105     | 2026-07-30 | requireAdmin re-checks studioMembers uid→studioId on every request                                         |
| AURA-106     | 2026-07-30 | Media access = signed/expiring R2; PIN download-only; residual → 386                                       |
| AURA-107     | 2026-07-30 | rateLimitShared via Firestore rateLimits; download + homepage-pw                                           |
| AURA-108     | 2026-07-30 | Comments honeypot/time-trap; shared tighter limits favorites/contact/photo-view                            |
| AURA-109     | 2026-07-30 | Google refresh tokens AES-GCM sealed at rest; lazy plaintext upgrade                                       |
| AURA-110     | 2026-07-30 | Expired auth sessions purged; clientLogout = Aura + Firebase Auth                                          |
| AURA-112     | 2026-07-30 | Maintenance cron: expire galleries + email/auth; watermark→387 analytics→117                               |
| AURA-113     | 2026-07-30 | Derivative paths for png/webp/bin; rewatermark + delete use storage-paths                                   |
| AURA-131     | 2026-07-30 | Walk-in projects: email optional until send; shared PROJECT_EMAIL_REQUIRED                                 |
| AURA-132     | 2026-07-30 | Bookings: loading EmptyState; single empty pattern; PATCH rejects non-pending; optimistic status           |
| AURA-133     | 2026-07-30 | Contract preview: ContractPublicView; template page; workflow draft /c/ before send; promote on send       |
| AURA-134     | 2026-07-30 | Open payment links: Min/Max in edit UI; validated defaults; pay page amount range label                   |
| AURA-135     | 2026-07-30 | Packages: no seeded $0 tiers; confirm before create/send with $0; empty pricing blocked                   |
| AURA-136     | 2026-07-30 | Email toasts: Quote/Pay/Gallery “ready” when not emailed; payments “Couldn't email”                       |
| AURA-137     | 2026-07-30 | Cancel link moved from workflow header to project More menu                                               |
| AURA-138     | 2026-07-30 | ShootDay preview already Dialog (AURA-212); removed duplicate Close button                                |
| AURA-139     | 2026-07-30 | Helper copy → Session day; sparse empty/done; plan/handoff session language                               |
| AURA-140     | 2026-07-30 | Login mode toggle → SegmentedControl (Sign in / Create studio)                                            |
| AURA-141     | 2026-07-30 | Bottom tabs: text-xs labels + Home; --admin-tab-bar 3.5rem                                                |
| AURA-370     | 2026-07-30 | adminSlug project/session paths; session-first /admin/sessions; id deep-links kept                             |
| AURA-200     | 2026-07-30 | Keep Firestore `proposals`; Quote noun via /api/quotes — no collection rename                                  |
| AURA-387     | 2026-07-30 | watermarkJobs queue + cron drain; no image I/O under updateStudioDb; photo patches only                        |
| AURA-386     | 2026-07-30 | /api/media HMAC-bound; path-only 403; remint on gallery/wizard/studio/analytics/book GET                       |
| AURA-384     | 2026-07-30 | /api/clients + /api/shoots → 410; session plan/wizard/wrap owned under /api/sessions                            |
| AURA-369     | 2026-07-30 | GCal: selectable calendarId; event dateTime+studio timeZone; freeBusy/CRUD use chosen calendar                 |
| AURA-150     | 2026-07-30 | Public pay: submitLock + redirecting lock; rate-limit POST; pairs Stripe Idempotency-Key (365)                 |
| AURA-149     | 2026-07-30 | Transactional emailOutbox on Resend fail; emailClient studioId; contact skipOutbox; cron drain both kinds      |
| AURA-148     | 2026-07-30 | Hub Download chooser: All photos / Favorites (N); favorites view chrome downloads favorites                    |
| AURA-147     | 2026-07-30 | Public gallery footer shows studio logo when logoUrl present                                                   |
| AURA-146     | 2026-07-30 | Booking received → emailBookingReceived; honors emailClientBooking like confirmed                              |
| AURA-145     | 2026-07-30 | Client reschedule request on /cancel (not auto-slot); studio notify; bookings surface preferred time           |
| AURA-144     | 2026-07-30 | Email shell: light canvas always (dark kits → Linen); studio accent on CTAs/links via emailShellColors          |
| AURA-143     | 2026-07-30 | Gallery alts: filename/ordinal via galleryPhotoAlt; masonry open label + lightbox; decorative covers stay empty |
| AURA-142     | 2026-07-30 | Analytics: days range API + SegmentedControl; CSV export of day series                                    |
| AURA-130     | 2026-07-30 | Projects list: stage + workflow filters; human workflow step on each row                                   |
| AURA-129     | 2026-07-30 | Prep/delivery badges aggregate all open sessions; 1 of N labels; workflow API                              |
| AURA-128     | 2026-07-30 | Pricing step: inline Add session when project has none                                                     |
| AURA-127     | 2026-07-30 | Project header: Archive/Delete behind More; All projects primary (ActionStack menuIds)                     |
| AURA-125     | 2026-07-30 | Removed dead firestore-store, Countdown.tsx, hashPassword; indexes already wired                           |
| AURA-124     | 2026-07-30 | Admin Jump/⌘K command palette → projects + pages                                                          |
| AURA-117     | 2026-07-30 | Cron analytics retention: age prune + per-studio soft cap; no studio RMW                                   |
| AURA-116     | 2026-07-30 | Gallery/analytics attribution via sessionId; legacy shootId promoted on read; new events omit shootId      |
| AURA-115     | 2026-07-30 | Funnel: booking_submitted + contract_signed; quote events get project/session ids                           |
| AURA-101     | 2026-07-30 | Unarchive project only; sessions stay archived (no blind booked)                                           |
| AURA-100     | 2026-07-30 | Session delete cancels linked pending/confirmed bookings (no orphan requests)                              |
| AURA-099     | 2026-07-30 | Delete tombstones block RMW resurrection; GCal cleanup in deleteShootCascade                               |
| AURA-097     | 2026-07-30 | NotificationBell: count badge, unread chrome, optimistic mark-all, dismiss UX                              |
| AURA-096     | 2026-07-30 | Admin chrome: icon tabs, no hamburger duplex, slimmer header + --admin-tab-bar                             |
| AURA-095     | 2026-07-30 | ListEditor: Select/Panel/Field throughout intake, pricing, partners, shots                                 |
| AURA-094     | 2026-07-30 | Bookings/Library/Projects PageHeaders label-first (no header essays)                                       |
| AURA-093     | 2026-07-30 | Analytics human labels + project·session filter (no id slices)                                             |
| AURA-092     | 2026-07-30 | Dialog/lightbox a11y: autofocus priority, labelledby, Escape ownership                                     |
| AURA-084     | 2026-07-30 | Analytics/payments List+ListRow; workflow section + divide-y (no Card chrome)                              |
| AURA-072     | 2026-07-30 | Type labels: Project type / Session label / Applies to / Session type (booking)                            |
| AURA-071     | 2026-07-30 | Hub send forms removed; workflow canonical for contract/Q/pay                                              |
| AURA-069     | 2026-07-30 | Documents tabs; decoupled contract/questionnaire project pickers                                           |
| AURA-068     | 2026-07-30 | Shared SessionShootDay for wizard + helper; wake lock + prefs parity                                       |
| AURA-066     | 2026-07-30 | Mobile More ops-first; Bookings pending badge (`view=badges`)                                              |
| AURA-065     | 2026-07-30 | Nav Prep hub → Library; session wizard Prep unchanged                                                      |
| AURA-064     | 2026-07-30 | Galleries admin index + paginated API; More nav                                                            |
| AURA-063     | 2026-07-30 | Server legacy admin redirects; ADMIN_ROUTES.md; Projects nav narrowed                                      |
| AURA-062     | 2026-07-30 | Prep hub only; packages/shot-lists redirect + ?tab=                                                        |
| AURA-061     | 2026-07-30 | Deleted IdeasPanel + /api/ideas; /admin/ideas → Prep                                                       |
| AURA-060     | 2026-07-30 | Verified dead IntakeStep/QuoteStep already deleted (192); closed                                           |
| AURA-280     | 2026-07-30 | ADR + agent rules aligned; persist ADR; AGENTS.md; closed 126/058/059                                      |
| AURA-126     | 2026-07-30 | Closed with 280 — per-entity persist in ADR                                                                |
| AURA-058     | 2026-07-30 | Closed with 273/280 — projects/sessions API cutover                                                        |
| AURA-059     | 2026-07-30 | Closed with 168/197/280 — no dual-write                                                                    |
| AURA-279     | 2026-07-30 | Delivery observability: notify + dashboard for email/calendar/payments failures                            |
| AURA-278     | 2026-07-30 | Copy/a11y DoD; Dialog focus trap; infra + Client/Shoot labels; closed 085/086                              |
| AURA-085     | 2026-07-30 | Closed with 278 — Firebase/Stripe out of user-facing errors                                                |
| AURA-086     | 2026-07-30 | Closed with 278 — Project/Session admin copy                                                               |
| AURA-119     | 2026-07-30 | Closed with 277 — payment → prep only from deposit                                                         |
| AURA-120     | 2026-07-30 | Closed with 277 — contract sign does not regress past deposit                                              |
| AURA-118     | 2026-07-30 | Closed with 173/277 — triple-state rules + readiness badges                                                |
| AURA-082     | 2026-07-30 | Closed with 274 — Checkbox/Switch/Select on listed admin surfaces                                          |
| AURA-083     | 2026-07-30 | Closed with 274 — ButtonLink/PublicCta/Button on listed ad-hoc sites                                       |
| Audit        | 2026-07-30 | Deep responsive multi-agent pass; enriched 088/089/283–287; added 375–383; W12 order updated               |
| AURA-122     | 2026-07-30 | Superseded → `[!]` (keep 248)                                                                              |
| AURA-111     | 2026-07-30 | Closed with 227 — slug→studioId homepageSlugs collection                                                   |
| AURA-121     | 2026-07-30 | Closed with 346 — single-owner, no multi-role UI                                                           |
| AURA-265     | 2026-07-30 | Closed with 346 — permissions clarity via honest Team                                                      |
| AURA-310     | 2026-07-30 | Closed with 341 — Settings Contact delivery prefs                                                          |
| AURA-123     | 2026-07-30 | Closed with 338 — USD-only declared in Settings → Payments                                                 |
| AURA-090     | 2026-07-30 | Closed with 328 timezone picker                                                                            |
| AURA-091     | 2026-07-29 | Cover logo FileUploadButton via studio/logo kind=cover                                                     |
| AURA-087     | 2026-07-29 | City/state/ZIP stack via 320                                                                               |
| AURA-070     | 2026-07-29 | Closed with 317 stopgap routes                                                                             |
| AURA-114/190 | 2026-07-29 | endsAt PATCH (with 152/026); marked done                                                                   |
| AURA-189     | 2026-07-29 | Superseded → `[!]` (keep 161)                                                                              |
| Audit        | 2026-07-29 | App re-eval: 037/060/070/201/202 rewritten; 114/190 done, 189 `[!]`; added 364–369; waves updated          |
| AURA-361     | 2026-07-29 | Unified direct R2 upload; photos get Sharp derivatives on complete; video multipart                        |
| AURA-388     | 2026-07-31 | Regenerated static PWA icons; SW v6 resilient precache                                                     |
| AURA-389     | 2026-07-31 | Prod HMAC/seal secrets fail-closed; App Hosting `AURA_SESSION_SECRET`; mint 503                            |
| AURA-395     | 2026-07-31 | Public gallery photo page via Firestore offset/limit + count; cover ids scoped                              |
| AURA-396     | 2026-07-31 | `countPhotosByGalleryId` via Firestore aggregation count (no full-list load)                               |
| AURA-390     | 2026-07-31 | Security headers + CSP Report-Only (enforce via `AURA_CSP_ENFORCE`); `/api/csp-report`                     |
| AURA-391     | 2026-07-31 | Google Calendar OAuth CSRF `state` + signed cookie verify on callback                                      |
| AURA-392     | 2026-07-31 | rateLimitShared on auth + pay/book/accept/sign/cancel/questionnaire                                        |
| AURA-393     | 2026-07-31 | SW `controllerchange` reload-once after update (not first install)                                         |
| AURA-394     | 2026-07-31 | SW v7: no App Router HTML cache; offline navigate → `/offline.html` only                                   |
| AURA-397     | 2026-07-31 | Public download gallery-scoped photos (no `readStudioDb` photo graph)                                      |
| AURA-399     | 2026-07-31 | Book + ProjectWorkflowPanel mutations via mutateJson (offline toast, clear pending)                        |
| AURA-400     | 2026-07-31 | Admin PWA icons via public `studio=` query; legacy `surface=admin` → static (no 401)                       |
| AURA-398     | 2026-07-31 | Root fonts = Fraunces+Figtree; kit faces on-demand (EnsureKitFonts / settings)                              |
| AURA-404     | 2026-07-31 | Shoot-day optimistic rollbacks are field-scoped (no stale full-plan wipe)                                  |
| AURA-407     | 2026-07-31 | Book GET → session types only; dashboard skips photos + analytics                                          |
| AURA-401     | 2026-07-31 | Route loading/error shells for admin, `/g`, `/h`, `/book` (EmptyState + Try again)                         |
| AURA-402     | 2026-07-31 | Unknown gallery token → 404 manifest; no installable “Aura Gallery” metadata                               |
| AURA-403     | 2026-07-31 | Gallery InstallHint dismiss key scoped per token (`aura-install-dismiss-g-*`)                              |
| AURA-405     | 2026-07-31 | NotificationBell focus trap + Escape; mark-read/mark-all rollback on failure                               |
| AURA-406     | 2026-07-31 | Favorites heart toggle via Firestore transaction (no lost ids under concurrent taps)                       |
| AURA-408     | 2026-07-31 | `/api/status` prod strips project/R2/host unless admin; public health is `{ ok, error }` only               |
| AURA-409     | 2026-07-31 | Muted token + sand/olive/spring/sage kits AA on canvas; gallery chrome/AlbumNav to `text-xs`              |
| AURA-410     | 2026-07-31 | `desk` chrome retirement (1024×560); builder density at 768 via step tabs / 2-col kits / wrap segments   |
| AURA-411     | 2026-07-31 | Gallery guest overlays lazy-chunked (lightbox/PIN/contact/comments) + OverlayChunkLoading               |
| AURA-412     | 2026-07-31 | GalleryThumb: reserved aspect + srcSet/sizes; public photo width/height; AlbumTile uses helper          |
| AURA-413     | 2026-07-31 | photo-view analytics session-deduped (one RTT per photo; open + swipe)                                 |
| AURA-414     | 2026-07-31 | `clientIp` trusts CF-Connecting-IP / rightmost XFF (not spoofable leftmost)                             |
| AURA-415     | 2026-07-31 | Admin API mutation Origin/Referer allowlist in middleware (prod default; AURA_ADMIN_ORIGINS)            |
| AURA-416     | 2026-07-31 | Public quote GET/POST via `toPublicProposal` allowlist (no full proposal doc)                           |
| AURA-417     | 2026-07-31 | Dialog marks body siblings `inert`/`aria-hidden` while open (nested-safe)                               |
| AURA-418     | 2026-07-31 | `/q` + `/cancel` theme-color + manifests/InstallHint (public-flow PWA, no SW)                            |
| AURA-419     | 2026-07-31 | Demote Dashboard Messages; contactNotifyHref; project trail only                                         |
| AURA-420     | 2026-07-31 | Bookings intake copy; project Messages empty clarifies email trail                                       |
| AURA-421     | 2026-07-31 | Contact notify → New project prefill; link contact on create; email CTA                                  |
| Audit        | 2026-07-31 | Comprehensive Web/PWA audit → `WEB_PWA_AUDIT.md`; open **388–418** as W15 / Phase 21                       |
| Audit        | 2026-07-31 | UI/responsive deep dive → Phase 23 / W17 **422–443**; canvas `ui-responsive-audit`                         |
| Audit        | 2026-07-31 | UI/responsive second pass → **444–460** (PWA preview, lightbox, heroes, InstallHint, theme vars)           |
| AURA-422     | 2026-07-31 | Bottom-chrome vars + Toast `--chrome-bottom`; closed **438** phantom InstallHint offsets                   |
| AURA-423     | 2026-07-31 | `Sheet` primitive (portal, scrim, safe-area, focus trap) for Bell / ActionStack                            |
| AURA-424     | 2026-07-31 | NotificationBell → Sheet (no absolute dropdown under tab bar)                                              |
| AURA-425     | 2026-07-31 | ActionStack More → Sheet (clears tab bar; closes after action)                                             |
| AURA-426     | 2026-07-31 | Dialog L/R safe-area (`max(1rem, env(safe-area-inset-*))` all sides)                                       |
| AURA-427     | 2026-07-31 | `--admin-scroll-mt` for hash targets under sticky header + notch                                           |
| AURA-428     | 2026-07-31 | Week calendar phone: day headers + session links; month-grid chips stay decorative                         |
| AURA-429     | 2026-07-31 | Payments link rows → ActionStack (Copy primary; Archive in More)                                           |
| AURA-430     | 2026-07-31 | Calendar view toggle → SegmentedControl                                                                    |
| AURA-431     | 2026-07-31 | Default Tabs 3+: phone Select jump (Documents / Bookings)                                                  |
| AURA-432     | 2026-07-31 | Gallery coach `desk:` clearance; hide InstallHint while coach open                                         |
| AURA-433     | 2026-07-31 | AlbumView under chrome: no double safe-area-inset-top                                                      |
| AURA-434     | 2026-07-31 | Sub-albums at `/g/{gallery}/s/{album}`; legacy `/s` redirects                                               |
| AURA-435     | 2026-07-31 | Vertical GalleryHero pad = max(inset, gutter, safe-area); no competing pl-6                                |
| AURA-436     | 2026-07-31 | AlbumView actions → ActionStack (favorites / peek / sub-album)                                             |
| AURA-437     | 2026-07-31 | Quote packages → ChoiceCard; post-accept CTAs → ButtonLink                                                 |
| AURA-439     | 2026-07-31 | DeviceFramePreview: size container + mock safe-area; homepage/grid `@sm`/`cqw`/`cqh`                       |
| AURA-440     | 2026-07-31 | WebsiteBuilder: drag handle lg+ only; Move up/down primary on phone                                       |
| AURA-441     | 2026-07-31 | Wizard sticky footer: content spacer + document scroll-padding-bottom                                     |
| AURA-442     | 2026-07-31 | Delivery Layout phone: compact Go live + Checklist Sheet + Preview                                        |
| AURA-443     | 2026-07-31 | Design modules default Tabs; Jump icon-only below sm; Messages empty sparse                               |
| AURA-444     | 2026-07-31 | Contract template Preview same-tab (sessionStorage works in installed admin)                               |
| AURA-445     | 2026-07-31 | AdminSurfacePreview `/admin/preview/*`; wire docs/booking/public links/workflow                          |
| AURA-446     | 2026-07-31 | ShootPublicLinks header: Copy link Sheet on phone                                                        |
| AURA-447     | 2026-07-31 | New session + Brand social grids stack until md                                                          |
| AURA-448     | 2026-07-31 | Project Messages: tap truncated summary → Dialog with full body                                          |
| AURA-449     | 2026-07-31 | Lightbox: primary actions + Comments Sheet; short-vh rail safe-area-right                                |
| AURA-450     | 2026-07-31 | Heroes svh/cqh (`hero-fill-*`); homepage rails respect L/R safe-area                                     |
| AURA-451     | 2026-07-31 | InstallHintDock + clearance var; book/pay/h/p/c CTAs clear of hint                                       |
| AURA-452     | 2026-07-31 | `publicStudioShellProps` + theme on contract/pay/q/cancel APIs → PublicShell                             |
| AURA-453     | 2026-07-31 | `/p` packages+terms, `/pay` title, `/c` ContractPublicView: min-w-0 break-words                          |
| AURA-454     | 2026-07-31 | `.gallery-pad-x` (+ `-md`); diary/albums/PrintPartners/GuestState/coverless                              |
| AURA-455     | 2026-07-31 | `--gallery-scroll-mt` for `#photos` under sticky GalleryChrome + notch                                 |
| AURA-456     | 2026-07-31 | ConfirmProvider actions: flex-col-reverse + full-width below sm (PinModal)                              |
| AURA-457     | 2026-07-31 | `useVisualViewportFrame` on Dialog + Sheet; panel max-h vs keyboard                                    |
| AURA-458     | 2026-07-31 | ThemeSwatch cover: `--scrim` gradient + `text-on-media` (no hex/rgba)                                   |
| AURA-459     | 2026-07-31 | Public loading/error for p/c/pay/s/q/cancel/peek; client soft errors → EmptyState                       |
| AURA-460     | 2026-07-31 | Delivery Tabs; print:hidden Sign; Dialog/Masonry focus rings; peek InstallHint; email/titles           |
| Audit        | 2026-07-31 | Post-W17 third pass → Phase 24 / W18 **461–479**; canvas `post-w17-residual-audit`                    |
| AURA-461     | 2026-07-31 | Checkbox: size-11 hit wrapper (no p-3 -m-3 label overlap)                                            |
| AURA-462     | 2026-07-31 | Admin Preview → adminPreviewHref (no _blank/external); /h live same-tab                            |
| AURA-463     | 2026-07-31 | Admin InstallHintDock aboveChrome; wizard sticky/scroll pad clears install-hint-clearance         |
| AURA-464     | 2026-07-31 | /q /cancel dock+pad; homepage/gallery/PublicShell footer clearance; peek install-hint-pad         |
| AURA-465     | 2026-07-31 | GalleryHero phone pb clears `--gallery-thumb-bar`+safe-area for CTA (immersive/cinematic/minimal) |
| AURA-466     | 2026-07-31 | Contract Sign chrome → `useVisualViewportFrame` (above iOS keyboard)                               |
| AURA-467     | 2026-07-31 | AlbumView `max-sm:static`; AlbumNav outside sticky header + compact phone pad                    |
| AURA-468     | 2026-07-31 | Admin More → Sheet (scrim/focus trap); ButtonLink/Button for nav + Account/Log out               |
| AURA-469     | 2026-07-31 | Delivery/Feature Switch via Label+id; Select-all Button; thumb Checkbox                          |
| AURA-470     | 2026-07-31 | md+ week calendar sessions → SessionListLink (min-h-11)                                          |
| AURA-471     | 2026-07-31 | EmptyState for docs/bell/calendar/settings/Wrap/ShootDay/login bare muted empties               |
| AURA-472     | 2026-07-31 | `title` on truncated projects/galleries/dashboard/calendar chips/AdminSurfacePreview + Chip    |
| AURA-473     | 2026-07-31 | WebsiteBuilder Switch htmlFor; share Dialog ids; duration stack; ListEditor Required center    |
| AURA-474     | 2026-07-31 | AlbumNav/Social/PrintPartners/Guest/homepage → ButtonLink; favorites overlay → IconButton   |
| AURA-475     | 2026-07-31 | break-words on q/cancel/book/StudioMark/AlbumTile/contract/comments; datetime min-w-0         |
| AURA-476     | 2026-07-31 | session day; Plan ready; Visitors will…; mark-accepted skips “the client”                    |
| AURA-477     | 2026-07-31 | Sheet no overflow-hidden; Dialog/Sheet/InstallHint/Toast use --z-* tokens                    |
| AURA-478     | 2026-07-31 | SubAlbumClient LightboxPhotoFooter (download + favorite via hub APIs)                        |
| AURA-479     | 2026-07-31 | Video badge only; Loading/EmptyState on g/q/collections; zip project-details.txt             |


---

*Living document. Amend in place — do not start parallel lists. **Execution order** (waves) beats ID number. Performance, Responsive, and PWA bars apply to every fix. Media = Cloudflare R2 (Phase 0b / W1). Contact = Resend (Phase 19). Settings = Phase 20. Web/PWA audit residuals = Phase 21 / W15 — [`WEB_PWA_AUDIT.md`](WEB_PWA_AUDIT.md). Contact vs booking IA = Phase 22 / W16. UI/responsive residuals = Phase 23 / W17. Post-W17 residuals = Phase 24 / W18.*