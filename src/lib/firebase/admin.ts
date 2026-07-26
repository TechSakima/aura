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
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const root = /* turbopackIgnore: true */ process.cwd();
  const candidates = [explicit, "serviceAccountKey.json"].filter(
    Boolean,
  ) as string[];

  for (const file of candidates) {
    const resolved = path.isAbsolute(file) ? file : path.join(root, file);
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

export function firebaseAdminConfigured() {
  return Boolean(loadServiceAccount()) || canUseApplicationDefault();
}

function storageBucket() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

export function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0]!;

  const sa = loadServiceAccount();
  const bucket = storageBucket();

  if (sa) {
    return initializeApp({
      credential: cert(sa),
      projectId: sa.projectId || process.env.FIREBASE_PROJECT_ID,
      storageBucket: bucket,
    });
  }

  if (canUseApplicationDefault()) {
    try {
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
