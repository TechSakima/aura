"use client";

import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Full device sign-out (AURA-110 / AURA-385):
 * 1. DELETE Aura httpOnly session cookie + Firestore auth session row (`/api/auth/logout`)
 * 2. Sign out Firebase Auth client persistence (IndexedDB) so login silent-restore cannot re-mint a cookie
 *
 * Admin UI must use this — not cookie-only logout — or the next PWA open will stay signed in.
 */
export async function clientLogout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);

  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth).catch(() => undefined);
  }
}
