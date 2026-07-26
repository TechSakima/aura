import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { readDb, updateDb } from "@/lib/db/store";
import { firebaseReady } from "@/lib/db/require-firebase";
import { getAdminAuth } from "@/lib/firebase/admin";

const COOKIE = "aura_session";
const SESSION_DAYS = 14;
const SEED_ADMIN = "admin@aura.studio";

async function createSessionCookie() {
  const token = nanoid(32);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await updateDb((d) => {
    d.sessions = d.sessions.filter((s) => new Date(s.expiresAt) > new Date());
    d.sessions.push({ token, expiresAt });
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

/** Local password login is disabled — Firebase Auth only. */
export async function login(_email: string, _password: string) {
  return {
    ok: false as const,
    error: "Use Firebase email/password sign-in",
  };
}

/** Verify Firebase Auth ID token and open an Aura session cookie. */
export async function loginWithFirebaseIdToken(idToken: string) {
  if (!firebaseReady()) {
    return { ok: false as const, error: "Firebase is not configured" };
  }
  const auth = getAdminAuth();
  if (!auth) {
    return { ok: false as const, error: "Firebase Admin not configured" };
  }
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) {
      return { ok: false as const, error: "Token missing email" };
    }
    const db = await readDb();
    const current = db.studio.adminEmail?.toLowerCase() || "";
    const unlocked =
      !current || current === SEED_ADMIN || current === email;

    if (!unlocked) {
      return {
        ok: false as const,
        error: "This account is not the studio admin",
      };
    }

    if (current !== email) {
      await updateDb((d) => {
        d.studio.adminEmail = email;
      });
    }
    await createSessionCookie();
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Invalid Firebase token" };
  }
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await updateDb((d) => {
      d.sessions = d.sessions.filter((s) => s.token !== token);
    });
  }
  jar.delete(COOKIE);
}

export async function requireAdmin() {
  if (!firebaseReady()) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find(
    (s) => s.token === token && new Date(s.expiresAt) > new Date(),
  );
  if (!session) return null;
  return db.studio;
}

export async function hashPassword(password: string) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}
