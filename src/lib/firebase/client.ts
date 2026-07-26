import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

type WebAppConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

function configFromNextPublic(): WebAppConfig | null {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return null;
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/** App Hosting injects this at build/runtime when a web app is associated. */
function configFromWebAppEnv(): WebAppConfig | null {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WebAppConfig;
  } catch {
    return null;
  }
}

export function firebaseConfigured() {
  if (configFromNextPublic()?.apiKey) return true;
  if (configFromWebAppEnv()?.apiKey) return true;
  // App Hosting can bake defaults into the firebase package during install.
  return Boolean(process.env.K_SERVICE || process.env.FIREBASE_CONFIG);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (getApps().length) return getApps()[0]!;

  const explicit = configFromNextPublic() || configFromWebAppEnv();
  if (explicit?.apiKey) {
    return initializeApp(explicit);
  }

  // App Hosting / auto-initialized Firebase JS SDK (no-arg constructor).
  try {
    return initializeApp();
  } catch {
    return null;
  }
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseStorage() {
  const app = getFirebaseApp();
  return app ? getStorage(app) : null;
}

/** Browser-only Analytics (safe no-op on server). */
export async function initFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (!(await isSupported())) return null;
  return getAnalytics(app);
}
