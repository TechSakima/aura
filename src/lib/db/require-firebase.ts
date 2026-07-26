import {
  firebaseAdminConfigured,
  getAdminDb,
  getAdminStorage,
} from "@/lib/firebase/admin";

export class FirebaseNotConfiguredError extends Error {
  constructor(message = "Firebase Admin is required. Add serviceAccountKey.json and a Storage bucket.") {
    super(message);
    this.name = "FirebaseNotConfiguredError";
  }
}

export function assertFirebaseReady() {
  if (!firebaseAdminConfigured()) {
    throw new FirebaseNotConfiguredError();
  }
  const db = getAdminDb();
  const storage = getAdminStorage();
  const bucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!db || !storage || !bucket) {
    throw new FirebaseNotConfiguredError(
      "Firebase Admin or Storage bucket is not configured.",
    );
  }
  return { db, storage, bucketName: bucket };
}

export function firebaseReady(): boolean {
  try {
    assertFirebaseReady();
    return true;
  } catch {
    return false;
  }
}
