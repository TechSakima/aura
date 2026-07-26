import {
  firebaseAdminConfigured,
  getAdminDb,
  getAdminStorage,
  resolveStorageBucket,
} from "@/lib/firebase/admin";

export class FirebaseNotConfiguredError extends Error {
  constructor(
    message = "Firebase Admin is required. Add serviceAccountKey.json and a Storage bucket.",
  ) {
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
  const bucket = resolveStorageBucket();
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
