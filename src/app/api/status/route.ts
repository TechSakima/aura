import { NextResponse } from "next/server";
import { mediaBackend, storageBackend } from "@/lib/db/store";
import { firebaseReady } from "@/lib/db/require-firebase";
import { firebaseConfigured } from "@/lib/firebase/client";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";

export async function GET() {
  const ready = firebaseReady();
  return NextResponse.json({
    ok: ready,
    firebaseClient: firebaseConfigured(),
    firebaseAdmin: firebaseAdminConfigured(),
    dataBackend: ready ? storageBackend() : "unavailable",
    mediaBackend: ready ? mediaBackend() : "unavailable",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    hosting: [
      "aura-photo-manager.web.app",
      "aura-photo-manager.firebaseapp.com",
    ],
    error: ready
      ? null
      : "Firebase Admin + Storage bucket required. Add serviceAccountKey.json.",
  });
}
