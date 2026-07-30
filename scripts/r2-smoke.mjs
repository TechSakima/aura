/**
 * Smoke-test R2 credentials from `.env.local` (AURA-358).
 * Puts / gets / deletes a tiny object under studios/_aura-smoke/.
 *
 *   node scripts/r2-smoke.mjs
 *
 * Never prints secret values.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    throw new Error("Missing .env.local");
  }
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnvLocal();
const accountId = env.R2_ACCOUNT_ID?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
const bucket = env.R2_BUCKET?.trim();

const missing = [
  !accountId && "R2_ACCOUNT_ID",
  !accessKeyId && "R2_ACCESS_KEY_ID",
  !secretAccessKey && "R2_SECRET_ACCESS_KEY",
  !bucket && "R2_BUCKET",
].filter(Boolean);

if (missing.length) {
  console.error("FAIL: missing env:", missing.join(", "));
  process.exit(1);
}

// Cloudflare R2 Access Key IDs are 32 chars; AWS SDK rejects other lengths.
if (accessKeyId.length !== 32) {
  console.error(
    `FAIL: R2_ACCESS_KEY_ID length is ${accessKeyId.length}, expected 32.`,
  );
  console.error(
    "Fix .env.local — re-copy Access Key ID from Cloudflare R2 → Manage API Tokens (no extra character).",
  );
  process.exit(1);
}
if (secretAccessKey.length !== 64) {
  console.warn(
    `WARN: R2_SECRET_ACCESS_KEY length is ${secretAccessKey.length} (often 64). Continuing…`,
  );
}

const key = `studios/_aura-smoke/r2-smoke-${Date.now()}.txt`;
const body = Buffer.from(`aura-r2-smoke ${new Date().toISOString()}\n`, "utf8");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

console.log("R2 smoke");
console.log("  bucket:", bucket);
console.log("  accountId length:", accountId.length);
console.log("  key:", key);

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  console.log("  put: ok");

  await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  console.log("  head: ok");

  const got = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const chunks = [];
  for await (const chunk of got.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.startsWith("aura-r2-smoke")) {
    throw new Error("get returned unexpected body");
  }
  console.log("  get: ok");

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("  delete: ok");

  console.log("PASS: R2 read/write works");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("FAIL:", msg);
  process.exit(1);
}
