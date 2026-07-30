import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import {
  claimStudioMembership,
  createSession,
  createStudioWithDefaults,
  deleteSession,
  getMemberByUid,
  getSession,
  getStudioDoc,
} from "@/lib/db/store";
import { firebaseReady } from "@/lib/db/require-firebase";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  clearSessionCookieOptions,
  mintSessionCookieValue,
  SESSION_COOKIE,
  SESSION_DAYS,
  SESSION_MAX_AGE_SEC,
  sessionCookieOptions,
  verifySessionCookie,
} from "@/lib/session-cookie";
import type { AdminContext } from "@/lib/types";

export {
  clearSessionCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  sessionCookieOptions,
};

async function openSession(opts: {
  uid: string;
  email: string;
  studioId: string;
}) {
  const token = nanoid(32);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await createSession({
    token,
    expiresAt,
    uid: opts.uid,
    email: opts.email,
    studioId: opts.studioId,
  });

  return { token, expiresAt };
}

/** Verify Firebase Auth ID token and open an Aura session for an existing studio member. */
export async function loginWithFirebaseIdToken(idToken: string) {
  if (!firebaseReady()) {
    return { ok: false as const, error: "Sign-in is unavailable. Try again later." };
  }
  const auth = getAdminAuth();
  if (!auth) {
    return { ok: false as const, error: "Sign-in is unavailable. Try again later." };
  }
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    const uid = decoded.uid;
    if (!email || !uid) {
      return { ok: false as const, error: "Sign-in failed. Try again." };
    }

    let member = await getMemberByUid(uid);
    if (!member) {
      member = await claimStudioMembership({ uid, email });
    }
    if (!member) {
      return {
        ok: false as const,
        error: "No studio found for this account. Create a studio to get started.",
      };
    }

    const session = await openSession({
      uid,
      email,
      studioId: member.studioId,
    });
    return {
      ok: true as const,
      studioId: member.studioId,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  } catch {
    return { ok: false as const, error: "Invalid email or password" };
  }
}

/** After Firebase createUser — create studio + membership + session. */
export async function signupWithFirebaseIdToken(opts: {
  idToken: string;
  studioName: string;
}) {
  if (!firebaseReady()) {
    return { ok: false as const, error: "Sign-up is unavailable. Try again later." };
  }
  const auth = getAdminAuth();
  if (!auth) {
    return { ok: false as const, error: "Sign-up is unavailable. Try again later." };
  }

  const name = opts.studioName.trim();
  if (name.length < 2) {
    return { ok: false as const, error: "Studio name is required" };
  }

  try {
    const decoded = await auth.verifyIdToken(opts.idToken);
    const email = decoded.email?.toLowerCase();
    const uid = decoded.uid;
    if (!email || !uid) {
      return { ok: false as const, error: "Could not create account. Try again." };
    }

    const existing = await getMemberByUid(uid);
    if (existing) {
      return {
        ok: false as const,
        error: "This account already belongs to a studio. Sign in instead.",
      };
    }

    // Migrated owner email should claim, not create a second studio.
    const claimed = await claimStudioMembership({ uid, email });
    if (claimed) {
      const session = await openSession({
        uid,
        email,
        studioId: claimed.studioId,
      });
      return {
        ok: true as const,
        studioId: claimed.studioId,
        claimed: true as const,
        token: session.token,
        expiresAt: session.expiresAt,
      };
    }

    const { studio } = await createStudioWithDefaults({
      name,
      ownerEmail: email,
      ownerUid: uid,
    });

    const session = await openSession({
      uid,
      email,
      studioId: studio.id,
    });
    return {
      ok: true as const,
      studioId: studio.id,
      claimed: false as const,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  } catch {
    return { ok: false as const, error: "Could not create studio" };
  }
}

/** Mint signed cookie value for Set-Cookie (AURA-104). */
export async function mintAuthCookieValue(
  token: string,
  expiresAt: string,
): Promise<string> {
  return mintSessionCookieValue(token, expiresAt);
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  const verified = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  return verified?.token || null;
}

/**
 * Delete Firestore auth session for the current cookie.
 * Caller clears Set-Cookie on the response. Does not touch Firebase client Auth —
 * browser callers use `clientLogout` for both (AURA-110).
 */
export async function logout() {
  const token = await getSessionToken();
  if (token) {
    await deleteSession(token).catch(() => undefined);
  }
}

export async function requireAdmin(): Promise<AdminContext | null> {
  if (!firebaseReady()) return null;
  const token = await getSessionToken();
  if (!token) return null;

  const session = await getSession(token);
  // Do not mutate cookies here — layout/RSC cannot set cookies (AURA-294).
  // Admin layout redirects to /admin/login?next=… when this returns null.
  if (!session || new Date(session.expiresAt) <= new Date()) {
    return null;
  }
  if (!session.studioId || !session.uid) {
    return null;
  }

  // Live membership — revoked / deleted members stop immediately (AURA-105).
  const member = await getMemberByUid(session.uid);
  if (!member || member.studioId !== session.studioId) {
    return null;
  }

  const studio = await getStudioDoc(session.studioId);
  if (!studio) return null;

  return {
    studio,
    studioId: studio.id,
    uid: session.uid,
    email: session.email || member.email,
  };
}
