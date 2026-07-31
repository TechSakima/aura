/**
 * Aura service worker (AURA-290 / AURA-368 / AURA-300 / AURA-394).
 * Strategy: docs/PWA_SERVICE_WORKER.md
 *
 * - Registered per surface scope: /admin/, /g/, /h/, /book/ (not origin-wide)
 * - Precache static shell (offline page + icons)
 * - Navigations: network-first; offline → /offline.html (never App Router HTML cache)
 * - /api/* (except budgeted media thumbs): network only
 * - Media: thumb/preview derivatives only, capped byte budget; never originals
 * - Versioned caches; skipWaiting + clients.claim
 */
const VERSION = "v7";
const STATIC = `aura-static-${VERSION}`;
const MEDIA = `aura-media-${VERSION}`;

/** Soft cap for gallery derivative images (AURA-300). */
const MEDIA_BUDGET_BYTES = 48 * 1024 * 1024;
const MEDIA_SIZE_FALLBACK = { thumb: 80_000, preview: 350_000 };

/** Static shell — regenerate via `npm run icons` (AURA-388). */
const PRECACHE = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];

function isApiPath(pathname) {
  return pathname.startsWith("/api/");
}

function isNextInternal(pathname) {
  return pathname.startsWith("/_next/");
}

function isR2Host(hostname) {
  return (
    hostname.endsWith(".r2.cloudflarestorage.com") ||
    hostname.endsWith(".r2.dev") ||
    hostname.includes(".r2.")
  );
}

/** R2 / S3 signed browse URLs. */
function isSignedMediaUrl(url) {
  if (url.searchParams.has("X-Amz-Signature")) return true;
  if (url.searchParams.has("X-Amz-Credential")) return true;
  if (url.searchParams.has("X-Amz-Algorithm")) return true;
  return isR2Host(url.hostname);
}

/**
 * Cacheable browse media only: -thumb / -web / -wm under derivatives.
 * Never originals (AURA-300).
 * @returns {"thumb"|"preview"|null}
 */
function mediaKindFromPath(pathname) {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    /* keep raw */
  }
  if (path.includes("/originals/")) return null;
  if (/-thumb\./i.test(path)) return "thumb";
  if (/-(web|wm)\./i.test(path)) return "preview";
  return null;
}

function mediaKindForUrl(url) {
  if (url.origin === self.location.origin) {
    if (!url.pathname.startsWith("/api/media/")) return null;
    return mediaKindFromPath(url.pathname);
  }
  if (!isSignedMediaUrl(url) && !isR2Host(url.hostname)) return null;
  return mediaKindFromPath(url.pathname);
}

function isImageLikeRequest(request) {
  const d = request.destination;
  // Empty destination is common for <img>; kind gate already restricts paths.
  if (d === "image" || d === "") return true;
  const accept = (request.headers.get("Accept") || "").toLowerCase();
  return accept.includes("image");
}

function canCacheMediaResponse(response) {
  if (!response || !response.ok) return false;
  if (response.type === "opaque") return true;
  if (response.headers.has("Set-Cookie")) return false;
  const ct = (response.headers.get("Content-Type") || "").toLowerCase();
  if (!ct || ct.startsWith("image/")) return true;
  return false;
}

async function estimateResponseBytes(response, kind) {
  const cl = response.headers.get("Content-Length");
  if (cl) {
    const n = Number(cl);
    if (Number.isFinite(n) && n > 0) return n;
  }
  try {
    const buf = await response.clone().arrayBuffer();
    if (buf.byteLength > 0) return buf.byteLength;
  } catch {
    /* opaque / locked */
  }
  return MEDIA_SIZE_FALLBACK[kind] || MEDIA_SIZE_FALLBACK.preview;
}

/**
 * FIFO trim; drop previews before thumbs when over budget (AURA-300).
 */
async function enforceMediaBudget(cache) {
  const keys = await cache.keys();
  const entries = [];
  for (const req of keys) {
    const res = await cache.match(req);
    if (!res) continue;
    const kind =
      mediaKindFromPath(new URL(req.url).pathname) ||
      mediaKindForUrl(new URL(req.url)) ||
      "preview";
    const size = await estimateResponseBytes(res, kind);
    entries.push({ req, kind, size });
  }

  let total = entries.reduce((sum, e) => sum + e.size, 0);
  if (total <= MEDIA_BUDGET_BYTES) return;

  const previews = entries.filter((e) => e.kind === "preview");
  const thumbs = entries.filter((e) => e.kind === "thumb");
  const order = previews.concat(thumbs);

  for (const entry of order) {
    if (total <= MEDIA_BUDGET_BYTES) break;
    await cache.delete(entry.req);
    total -= entry.size;
  }
}

async function putMediaWithBudget(request, response, kind) {
  const cache = await caches.open(MEDIA);
  await cache.put(request, response.clone());
  await enforceMediaBudget(cache);
  return kind;
}

async function mediaCacheFirst(request, kind) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(request);
  if (hit) return hit;

  try {
    const res = await fetch(request);
    if (canCacheMediaResponse(res)) {
      try {
        await putMediaWithBudget(request, res, kind);
      } catch {
        /* quota / put failures — still return network response */
      }
    }
    return res;
  } catch {
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

async function offlineNavigateResponse() {
  const offline = await caches.match("/offline.html");
  return (
    offline ||
    new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC);
      /* Per-URL add — one 404 must not abort entire SW install (AURA-388). */
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[sw] precache skip", url, err);
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC, MEDIA]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports?.[0]?.postMessage({
      version: VERSION,
      mediaBudgetBytes: MEDIA_BUDGET_BYTES,
    });
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const mediaKind = mediaKindForUrl(url);

  // Thumb / preview derivatives — budgeted cache (same-origin proxy or R2)
  if (mediaKind && isImageLikeRequest(request)) {
    event.respondWith(mediaCacheFirst(request, mediaKind));
    return;
  }

  // Other cross-origin (non-thumb R2, CDNs): browser only
  if (url.origin !== self.location.origin) {
    return;
  }

  // Signed params on same-origin (unusual): network only
  if (isSignedMediaUrl(url)) {
    return;
  }

  // Remaining APIs + Next runtime: network only
  if (isApiPath(url.pathname) || isNextInternal(url.pathname)) {
    return;
  }

  // Auth entry: never cache
  if (url.pathname.startsWith("/admin/login")) {
    return;
  }

  // Precached static icons / offline shell — cache-first
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navigations: network-first; offline → self-contained /offline.html (AURA-394).
  // Never cache App Router HTML — /_next chunks are network-only and leave blank shells.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return offlineNavigateResponse();
        }
      })(),
    );
  }
});
