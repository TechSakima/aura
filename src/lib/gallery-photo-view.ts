/**
 * Session-deduped gallery photo-view analytics (AURA-413).
 * One RTT per photoId per browser tab session — coalesces reopen / swipe / double-tap.
 */

const STORAGE_PREFIX = "aura-photo-view:";
const MAX_IDS = 400;

/** In-flight + memory cache (same tab, avoids sessionStorage parse on every swipe). */
const seen = new Set<string>();
const pending = new Set<string>();

function memKey(token: string, photoId: string) {
  return `${token}:${photoId}`;
}

function readSessionIds(token: string): string[] {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${token}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeSessionIds(token: string, ids: string[]) {
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${token}`,
      JSON.stringify(ids.slice(-MAX_IDS)),
    );
  } catch {
    /* private mode / quota */
  }
}

function alreadyRecorded(token: string, photoId: string): boolean {
  const k = memKey(token, photoId);
  if (seen.has(k)) return true;
  const ids = readSessionIds(token);
  if (ids.includes(photoId)) {
    seen.add(k);
    return true;
  }
  return false;
}

function markRecorded(token: string, photoId: string) {
  const k = memKey(token, photoId);
  seen.add(k);
  const ids = readSessionIds(token);
  if (!ids.includes(photoId)) {
    ids.push(photoId);
    writeSessionIds(token, ids);
  }
}

/**
 * Fire-and-forget photo_view — skips if already counted this session.
 * Call from lightbox open / index change; never await on the hot path.
 */
export function recordGalleryPhotoView(token: string, photoId: string): void {
  if (!token || !photoId) return;
  const k = memKey(token, photoId);
  if (alreadyRecorded(token, photoId) || pending.has(k)) return;

  pending.add(k);
  void fetch(`/api/public/galleries/${encodeURIComponent(token)}/photo-view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoId }),
  })
    .then((res) => {
      if (res.ok) markRecorded(token, photoId);
    })
    .catch(() => {
      /* allow retry on next open */
    })
    .finally(() => {
      pending.delete(k);
    });
}
