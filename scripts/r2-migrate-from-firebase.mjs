/**
 * AURA-359 — Copy Firebase Storage `studios/**` → Cloudflare R2.
 * Dual-read stays in place until AURA-360 cutover.
 *
 *   node scripts/r2-migrate-from-firebase.mjs              # dry-run
 *   node scripts/r2-migrate-from-firebase.mjs --execute    # copy + verify
 *   node scripts/r2-migrate-from-firebase.mjs --execute --delete
 *   node scripts/r2-migrate-from-firebase.mjs --execute --limit=20
 *
 * Requires: serviceAccountKey.json (or FIREBASE_* env) + R2_* in .env.local
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = val;
  }
  return out;
}

function parseArgs(argv) {
  const flags = {
    execute: false,
    delete: false,
    prefix: "studios/",
    limit: Infinity,
    concurrency: 4,
  };
  for (const arg of argv) {
    if (arg === "--execute") flags.execute = true;
    else if (arg === "--delete") flags.delete = true;
    else if (arg === "--dry-run") flags.execute = false;
    else if (arg.startsWith("--prefix=")) flags.prefix = arg.slice("--prefix=".length);
    else if (arg.startsWith("--limit=")) {
      flags.limit = Number(arg.slice("--limit=".length)) || Infinity;
    } else if (arg.startsWith("--concurrency=")) {
      flags.concurrency = Math.max(
        1,
        Number(arg.slice("--concurrency=".length)) || 4,
      );
    }
  }
  return flags;
}

function loadServiceAccount(env) {
  const explicit =
    env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [explicit, "serviceAccountKey.json", "ServiceAccountKey.json"].filter(
    Boolean,
  );
  for (const rel of candidates) {
    const path = resolve(process.cwd(), rel);
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8"));
    }
  }
  if (
    (env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL) &&
    (env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)
  ) {
    return {
      project_id:
        env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      client_email:
        env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
      private_key: (
        env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY
      ).replace(/\\n/g, "\n"),
    };
  }
  return null;
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

const env = { ...loadEnvLocal(), ...process.env };
const flags = parseArgs(process.argv.slice(2));

const accountId = env.R2_ACCOUNT_ID?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
const r2Bucket = env.R2_BUCKET?.trim();
if (!accountId || !accessKeyId || !secretAccessKey || !r2Bucket) {
  console.error("FAIL: missing R2_* in .env.local");
  process.exit(1);
}

const sa = loadServiceAccount(env);
if (!sa) {
  console.error(
    "FAIL: missing serviceAccountKey.json (or FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)",
  );
  process.exit(1);
}

const bucketName =
  env.FIREBASE_STORAGE_BUCKET ||
  env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "aura-photo-manager.firebasestorage.app";

const app =
  getApps()[0] ||
  initializeApp({
    credential: cert(sa),
    projectId: sa.project_id || sa.projectId,
    storageBucket: bucketName,
  });

const fbBucket = getStorage(app).bucket(bucketName);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

console.log("Firebase → R2 migrate (AURA-359)");
console.log("  firebase bucket:", bucketName);
console.log("  r2 bucket:", r2Bucket);
console.log("  prefix:", flags.prefix);
console.log("  mode:", flags.execute ? (flags.delete ? "execute+delete" : "execute") : "dry-run");
console.log("  concurrency:", flags.concurrency);

const [files] = await fbBucket.getFiles({ prefix: flags.prefix });
const objects = files
  .filter((f) => f.name && !f.name.endsWith("/"))
  .slice(0, Number.isFinite(flags.limit) ? flags.limit : undefined);

console.log("  firebase objects:", objects.length);
if (!objects.length) {
  console.log("PASS: nothing to migrate under", flags.prefix);
  process.exit(0);
}

async function r2Head(key) {
  try {
    const res = await r2.send(
      new HeadObjectCommand({ Bucket: r2Bucket, Key: key }),
    );
    return { exists: true, size: Number(res.ContentLength || 0) };
  } catch (e) {
    const code = e?.name || e?.Code || "";
    if (code === "NotFound" || code === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
      return { exists: false, size: 0 };
    }
    throw e;
  }
}

let copied = 0;
let skipped = 0;
let failed = 0;
let deleted = 0;

const results = await mapPool(objects, flags.concurrency, async (file) => {
  const key = file.name;
  const meta = file.metadata || {};
  const size = Number(meta.size || 0);
  const contentType = meta.contentType || "application/octet-stream";

  try {
    const head = await r2Head(key);
    if (head.exists && head.size === size && size > 0) {
      skipped += 1;
      if (!flags.execute) {
        return { key, status: "skip-exists" };
      }
      if (flags.delete) {
        await file.delete({ ignoreNotFound: true });
        deleted += 1;
        return { key, status: "skip-exists-deleted-fb" };
      }
      return { key, status: "skip-exists" };
    }

    if (!flags.execute) {
      copied += 1; // would-copy count in dry-run
      return { key, status: "would-copy", size };
    }

    const [buf] = await file.download();
    await r2.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
        CacheControl: meta.cacheControl || undefined,
      }),
    );

    const verify = await r2Head(key);
    if (!verify.exists || verify.size !== buf.length) {
      throw new Error(
        `verify failed (r2 size ${verify.size} vs ${buf.length})`,
      );
    }

    copied += 1;

    if (flags.delete) {
      await file.delete({ ignoreNotFound: true });
      deleted += 1;
      return { key, status: "copied-deleted-fb", size: buf.length };
    }
    return { key, status: "copied", size: buf.length };
  } catch (e) {
    failed += 1;
    const msg = e instanceof Error ? e.message : String(e);
    console.error("  FAIL", key, msg);
    return { key, status: "error", error: msg };
  }
});

const sample = results.filter((r) => r?.status?.startsWith("would") || r?.status === "copied").slice(0, 5);
console.log("Sample:", sample);
console.log(
  flags.execute
    ? `Done: copied=${copied} skipped=${skipped} deletedFb=${deleted} failed=${failed}`
    : `Dry-run: wouldCopy≈${copied} alreadyOnR2=${skipped} failed=${failed}`,
);

if (failed) process.exit(1);
console.log(
  flags.execute
    ? "PASS: migration batch complete (dual-read still active until AURA-360)"
    : "PASS: dry-run complete — re-run with --execute to copy",
);
