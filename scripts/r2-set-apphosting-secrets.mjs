/**
 * Push R2_* from `.env.local` into Firebase App Hosting secrets (AURA-358).
 * Never prints secret values.
 *
 *   node scripts/r2-set-apphosting-secrets.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";

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
const secrets = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];

for (const name of secrets) {
  const value = env[name]?.trim();
  if (!value) {
    console.error(`FAIL: missing ${name} in .env.local`);
    process.exit(1);
  }
  console.log(`Setting ${name} (len=${value.length})…`);
  const firebaseJs = resolve(
    process.cwd(),
    "node_modules/firebase-tools/lib/bin/firebase.js",
  );
  const result = spawnSync(process.execPath, [firebaseJs, "apphosting:secrets:set", name, "--data-file", "-", "--force"], {
    input: value,
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  if (result.status !== 0) {
    console.error(`FAIL: could not set ${name} (exit ${result.status})`);
    process.exit(result.status || 1);
  }
  console.log(`  ok: ${name}`);
}

console.log("PASS: App Hosting R2 secrets set");
console.log("Note: R2_BUCKET is a plain value in apphosting.yaml (aura-media).");
