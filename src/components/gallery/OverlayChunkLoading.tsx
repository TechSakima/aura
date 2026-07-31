/** Fallback while lazy gallery overlay chunk loads (pairs route loading — AURA-401/411). */
export function OverlayChunkLoading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-on-media">Loading…</p>
    </div>
  );
}
