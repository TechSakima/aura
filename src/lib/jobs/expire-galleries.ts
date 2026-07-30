import { COL } from "@/lib/db/collections";
import { assertFirebaseReady, firebaseReady } from "@/lib/db/require-firebase";
import { patchStudioDoc } from "@/lib/db/store";

/**
 * Mark past-due live galleries as expired (AURA-112).
 * Uses per-doc `patchStudioDoc` — never `updateStudioDb`.
 * Public gallery GET remains a lazy safety net.
 */
export async function expireDueGalleries(limit = 40): Promise<{
  expired: number;
  scanned: number;
}> {
  if (!firebaseReady()) {
    return { expired: 0, scanned: 0 };
  }

  const { db } = assertFirebaseReady();
  const now = new Date().toISOString();
  const cap = Math.min(Math.max(limit, 1), 100);

  let candidates: { id: string }[] = [];

  try {
    const snap = await db
      .collection(COL.galleries)
      .where("status", "==", "live")
      .where("expiresAt", "<=", now)
      .limit(cap)
      .get();
    candidates = snap.docs.map((d) => ({ id: d.id }));
  } catch {
    // Composite index may be missing until deployed — scan live + filter.
    const snap = await db
      .collection(COL.galleries)
      .where("status", "==", "live")
      .limit(Math.min(cap * 5, 200))
      .get();
    candidates = snap.docs
      .filter((d) => {
        const exp = d.data().expiresAt;
        return typeof exp === "string" && exp <= now;
      })
      .slice(0, cap)
      .map((d) => ({ id: d.id }));
  }

  let expired = 0;
  for (const g of candidates) {
    try {
      await patchStudioDoc(COL.galleries, g.id, {
        status: "expired",
        updatedAt: now,
      });
      expired += 1;
    } catch (err) {
      console.error("[jobs] expire gallery", g.id, err);
    }
  }

  return { expired, scanned: candidates.length };
}
