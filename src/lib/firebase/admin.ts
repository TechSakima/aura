/**
 * Firebase Admin — used by API routes for Firestore/Storage (bypasses security rules).
 * Credentials (in order):
 * 1. `serviceAccountKey.json` / env service-account fields (local)
 * 2. Application Default Credentials on App Hosting / Cloud Run
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function loadServiceAccount(): ServiceAccount | null {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  // App Hosting / Cloud Run use ADC — skip local key-file probing.
  if (
    process.env.K_SERVICE ||
    process.env.FIREBASE_APP_HOSTING ||
    (process.env.FIREBASE_CONFIG && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  ) {
    return null;
  }

  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [explicit, "serviceAccountKey.json"].filter(
    Boolean,
  ) as string[];

  for (const file of candidates) {
    const resolved = path.isAbsolute(file)
      ? file
      : path.join(/* turbopackIgnore: true */ process.cwd(), file);
    if (existsSync(resolved)) {
      const json = JSON.parse(readFileSync(resolved, "utf8")) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    }
  }

  return null;
}

function canUseApplicationDefault() {
  return Boolean(
    process.env.FIREBASE_CONFIG ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.K_SERVICE,
  );
}

function firebaseConfigJson(): {
  projectId?: string;
  storageBucket?: string;
} | null {
  const raw = process.env.FIREBASE_CONFIG;
  if (!raw || !raw.trim().startsWith("{")) return null;
  try {
    return JSON.parse(raw) as { projectId?: string; storageBucket?: string };
  } catch {
    return null;
  }
}

export function resolveStorageBucket(): string | undefined {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    firebaseConfigJson()?.storageBucket ||
    undefined
  );
}

export function firebaseAdminConfigured() {
  return Boolean(loadServiceAccount()) || canUseApplicationDefault();
}

export function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0]!;

  const sa = loadServiceAccount();
  const bucket = resolveStorageBucket();

  if (sa) {
    return initializeApp({
      credential: cert(sa),
      projectId: sa.projectId || process.env.FIREBASE_PROJECT_ID,
      storageBucket: bucket,
    });
  }

  if (canUseApplicationDefault()) {
    try {
      // Prefer no-arg init on App Hosting (uses FIREBASE_CONFIG + ADC).
      if (process.env.FIREBASE_CONFIG) {
        return initializeApp();
      }
      return initializeApp({
        credential: applicationDefault(),
        storageBucket: bucket,
      });
    } catch {
      return null;
    }
  }

  return null;
}

let adminDb: ReturnType<typeof getFirestore> | null | undefined;

export function getAdminDb() {
  if (adminDb !== undefined) return adminDb;
  const app = getAdminApp();
  if (!app) {
    adminDb = null;
    return null;
  }
  const db = getFirestore(app);
  // Optional fields often serialize as `undefined`; Firestore rejects those by default.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already initialized in this process (common after HMR) — writes also strip undefined.
  }
  adminDb = db;
  return db;
}

export function getAdminStorage() {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}

export function getAdminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}
