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
import type { AdminContext } from "@/lib/types";

const COOKIE = "aura_session";
const SESSION_DAYS = 14;

async function createSessionCookie(opts: {
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

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
  });

  return token;
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

    await createSessionCookie({
      uid,
      email,
      studioId: member.studioId,
    });
    return { ok: true as const, studioId: member.studioId };
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
      await createSessionCookie({
        uid,
        email,
        studioId: claimed.studioId,
      });
      return { ok: true as const, studioId: claimed.studioId, claimed: true };
    }

    const { studio } = await createStudioWithDefaults({
      name,
      ownerEmail: email,
      ownerUid: uid,
    });

    await createSessionCookie({
      uid,
      email,
      studioId: studio.id,
    });
    return { ok: true as const, studioId: studio.id, claimed: false };
  } catch {
    return { ok: false as const, error: "Could not create studio" };
  }
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value || null;
}

function clearSessionCookie(
  jar: Awaited<ReturnType<typeof cookies>>,
) {
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await deleteSession(token).catch(() => undefined);
  }
  clearSessionCookie(jar);
}

export async function requireAdmin(): Promise<AdminContext | null> {
  if (!firebaseReady()) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
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

  const studio = await getStudioDoc(session.studioId);
  if (!studio) return null;

  return {
    studio,
    studioId: studio.id,
    uid: session.uid,
    email: session.email,
  };
}

export async function hashPassword(password: string) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}
