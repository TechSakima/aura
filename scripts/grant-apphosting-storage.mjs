/**
 * Grant App Hosting compute SA permission to read/write Storage objects.
 * Run locally with serviceAccountKey.json present:
 *   node scripts/grant-apphosting-storage.mjs
 */
import { readFileSync } from "fs";
import { JWT } from "google-auth-library";

const PROJECT = "aura-photo-manager";
const BUCKET = "aura-photo-manager.firebasestorage.app";
const MEMBER =
  "serviceAccount:firebase-app-hosting-compute@aura-photo-manager.iam.gserviceaccount.com";
const ROLE = "roles/storage.objectAdmin";

const sa = JSON.parse(readFileSync("ServiceAccountKey.json", "utf8"));
const client = new JWT({
  email: sa.client_email,
  key: sa.private_key,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getBucketPolicy() {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/iam`;
  const res = await client.request({ url });
  return res.data;
}

async function setBucketPolicy(policy) {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/iam`;
  const res = await client.request({
    url,
    method: "PUT",
    data: policy,
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

const policy = await getBucketPolicy();
policy.bindings ||= [];
const existing = policy.bindings.find((b) => b.role === ROLE);
if (existing) {
  if (!existing.members.includes(MEMBER)) {
    existing.members.push(MEMBER);
  } else {
    console.log("Already granted:", ROLE, "→", MEMBER);
    process.exit(0);
  }
} else {
  policy.bindings.push({ role: ROLE, members: [MEMBER] });
}

await setBucketPolicy(policy);
console.log("Granted", ROLE, "on", BUCKET, "to", MEMBER);
