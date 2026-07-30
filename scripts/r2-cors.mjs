/**
 * Apply CORS so browsers can fetch R2 signed GET URLs (client-side zip, AURA-356).
 *
 * Object Read & Write tokens often cannot PutBucketCors — then paste the printed
 * JSON in Cloudflare → R2 → aura-media → Settings → CORS policy.
 *
 *   node scripts/r2-cors.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error("Missing .env.local");
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

const env = loadEnvLocal();
const accountId = env.R2_ACCOUNT_ID?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
const bucket = env.R2_BUCKET?.trim();

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("FAIL: missing R2_* in .env.local");
  process.exit(1);
}

const AllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://aura.stroburm.app",
  "https://aura--aura-photo-manager.us-east4.hosted.app",
];

const corsJson = [
  {
    AllowedOrigins,
    AllowedMethods: ["GET", "HEAD", "PUT"],
    AllowedHeaders: ["*"],
    ExposeHeaders: [
      "Content-Disposition",
      "Content-Length",
      "Content-Type",
      "ETag",
    ],
    MaxAgeSeconds: 3600,
  },
];

// Docs keep GET/HEAD-only sample below if you remove direct upload later.

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: corsJson },
    }),
  );
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("PASS: CORS set on", bucket);
  console.log(JSON.stringify(current.CORSRules, null, 2));
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("PutBucketCors failed:", msg);
  console.error(
    "\nYour R2 token may be Object Read & Write only (no Admin).",
  );
  console.error(
    "Paste this JSON in Cloudflare → R2 →",
    bucket,
    "→ Settings → CORS policy:\n",
  );
  console.log(JSON.stringify(corsJson, null, 2));
  process.exit(2);
}
