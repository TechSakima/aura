# Aura service worker strategy (AURA-290 / AURA-368 / AURA-300 / AURA-394)

Source: `public/sw.js` · register: `src/components/pwa/RegisterSW.tsx` · scopes: `src/lib/pwa-sw-scope.ts`

## Goals

- Installable surfaces use **scoped** SW registrations (not one origin-wide controller).
- Never cache auth mistakes (`Set-Cookie`, `Cache-Control: private|no-store`).
- APIs (except budgeted browse media) always hit the network.
- Gallery **thumb / preview** derivatives may be cached under a **byte budget**; **originals never**.
- Offline navigations get an honest shell (`/offline.html`) — **not** cached App Router HTML (which needs uncached `/_next` chunks).

## Registration scopes (AURA-368)

| Surface | Path prefix | `register(..., { scope })` |
|---------|-------------|----------------------------|
| Admin | `/admin…` | `/admin/` |
| Gallery | `/g/…` | `/g/` |
| Homepage | `/h/…` | `/h/` |
| Book | `/book/…` | `/book/` |
| Quote / contract / pay / cancel / other | — | **No SW** |

Manifest `scope` / `start_url` stay token- or slug-specific (AURA-288). The SW uses the surface prefix so one worker can serve that family of routes.

On register, any legacy registration with scope `origin/` (pre-368 sitewide) is unregistered.

## Cache buckets

| Cache | Versioned name | Contents |
|-------|----------------|----------|
| Static | `aura-static-v*` | Precache: offline page, PWA icons |
| Media | `aura-media-v*` | Thumb / preview derivatives only (AURA-300) |

Bump `VERSION` in `sw.js` on strategy or precache changes. Activate deletes other keys (including legacy `aura-pages-*`). Current: **v7** (AURA-394 — no App Router HTML page cache).

### Media budget (AURA-300)

- Cap: **48 MiB** (`MEDIA_BUDGET_BYTES`).
- Eligible URL paths: `-thumb.`, `-web.`, or `-wm.` (derivatives). Paths containing `/originals/` are never cached.
- Sources: same-origin `/api/media/…` and R2 signed / `.r2.` hosts (image requests only).
- Strategy: **cache-first** after first successful fetch; offline miss → `503` (honest).
- Eviction: FIFO; **previews** (`-web` / `-wm`) dropped before **thumbs** when over budget.
- Signed URL keys change when TTL refreshes — orphaned entries age out via the budget trim.

## Fetch rules

| Request | Strategy |
|---------|----------|
| `POST` / non-GET | Pass through |
| Image thumb/preview (`-thumb` / `-web` / `-wm`) on `/api/media` or R2 | Cache-first + budget |
| Other cross-origin (incl. non-thumb R2) | Pass through — no `respondWith` |
| Other URL with `X-Amz-*` on same origin | Pass through |
| Other `/api/*` | Network only |
| `/_next/*` | Network only |
| `/admin/login` | Network only |
| Precache paths (`/offline.html`, icons) | Cache-first |
| `navigate` | Network-first → `/offline.html` on failure (AURA-394) |

### Why not cache App Router HTML (AURA-394)

Next.js documents need matching `/_next/static` chunks. Those are network-only, so a cached HTML document offline often renders a **blank shell**. Honest offline = self-contained `/offline.html` (inline CSS, no chunk deps).

## Updates

1. `install` precaches, then `skipWaiting()`.
2. `activate` purges old caches, then `clients.claim()`.
3. Client registers with `updateViaCache: "none"` and posts `SKIP_WAITING` when a waiting worker appears.
4. After the page is already controlled, `controllerchange` triggers a single reload so clients pick up the new SW (AURA-393). First install does not reload.
5. SW is **not** registered in development (unregister + clear caches).

## Related issues

- **AURA-291** — in-app offline toasts / mutation honesty.
- **AURA-297** — gallery install UX within `/g/{token}` manifest scope.
- **AURA-300** — media cache budget (thumbs / previews only).
- **AURA-394** — offline navigate honesty (no App Router HTML cache).
