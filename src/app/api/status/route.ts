import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mediaBackend, storageBackend } from "@/lib/db/store";
import { firebaseReady } from "@/lib/db/require-firebase";
import { firebaseConfigured } from "@/lib/firebase/client";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  isProductionMediaRuntime,
  mediaDualReadEnabled,
} from "@/lib/storage/media-store";
import { isR2Configured } from "@/lib/storage/r2-store";

function publicStatus(ready: boolean) {
  return {
    ok: ready,
    error: ready ? null : "Service unavailable",
  };
}

function detailedStatus(ready: boolean) {
  const r2 = isR2Configured();
  return {
    ok: ready,
    firebaseClient: firebaseConfigured(),
    firebaseAdmin: firebaseAdminConfigured(),
    dataBackend: ready ? storageBackend() : "unavailable",
    mediaBackend: r2 ? "r2" : ready ? mediaBackend() : "unavailable",
    r2Configured: r2,
    r2RequiredInProd: isProductionMediaRuntime(),
    mediaDualRead: mediaDualReadEnabled(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    hosting: [
      "aura--aura-photo-manager.us-east4.hosted.app",
      "aura-photo-manager.web.app",
      "aura-photo-manager.firebaseapp.com",
    ],
    error: ready
      ? r2 || !isProductionMediaRuntime()
        ? null
        : "R2 required in production for media (set R2_* secrets)."
      : "Firebase Admin + Storage bucket required. On App Hosting, associate a web app and set NEXT_PUBLIC_* / FIREBASE_STORAGE_BUCKET.",
  };
}

export async function GET() {
  const ready = firebaseReady();
  const isProd = process.env.NODE_ENV === "production";

  // Production: full diagnostics for admins only (AURA-408).
  // Non-prod keeps detailed payload for local setup (`curl /api/status`).
  if (isProd) {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(publicStatus(ready));
    }
  }

  return NextResponse.json(detailedStatus(ready));
}
