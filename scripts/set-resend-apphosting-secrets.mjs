/**
 * Push RESEND_WEBHOOK_SECRET + CRON_SECRET from `.env.local` into App Hosting.
 * Never prints secret values.
 *
 *   node scripts/set-resend-apphosting-secrets.mjs
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
const secrets = ["RESEND_WEBHOOK_SECRET", "CRON_SECRET"];
const firebaseJs = resolve(
  process.cwd(),
  "node_modules/firebase-tools/lib/bin/firebase.js",
);

for (const name of secrets) {
  const value = env[name]?.trim();
  if (!value) {
    console.error(`FAIL: missing ${name} in .env.local`);
    process.exit(1);
  }
  console.log(`Setting ${name} (len=${value.length})…`);
  const result = spawnSync(
    process.execPath,
    [
      firebaseJs,
      "apphosting:secrets:set",
      name,
      "--data-file",
      "-",
      "--force",
      "--project",
      "aura-photo-manager",
    ],
    { input: value, encoding: "utf8", env: process.env },
  );
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  if (result.status !== 0) {
    console.error(`FAIL: could not set ${name} (exit ${result.status})`);
    process.exit(result.status || 1);
  }
  console.log(`  ok: ${name}`);
}

console.log("Granting aura backend access…");
const grant = spawnSync(
  process.execPath,
  [
    firebaseJs,
    "apphosting:secrets:grantaccess",
    "RESEND_WEBHOOK_SECRET,CRON_SECRET",
    "-b",
    "aura",
    "--project",
    "aura-photo-manager",
  ],
  { encoding: "utf8", env: process.env },
);
if (grant.stdout?.trim()) console.log(grant.stdout.trim());
if (grant.stderr?.trim()) console.error(grant.stderr.trim());
if (grant.status !== 0) {
  console.error(`FAIL: grantaccess (exit ${grant.status})`);
  process.exit(grant.status || 1);
}

console.log("PASS: App Hosting Resend webhook + cron secrets set and granted");
