/**
 * Local proof of migrations/0001_firestore_mirror.sql on aura-dev.
 *
 *   npm run d1:check
 *
 * Applies the migration to a throwaway Wrangler persistence directory, then
 * checks the unique keys, the three metadata foreign keys, and the query
 * plans for gallery token, photo page, auth session token, and analytics.
 * Does not talk to Cloudflare.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const persistTo = mkdtempSync(resolve(tmpdir(), "aura-d1-"));
const failures = [];

function wrangler(args, { allowFail = false } = {}) {
  try {
    const stdout = execFileSync("npx", ["wrangler", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    const result = {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
    if (!allowFail) {
      const detail = `${result.stderr}\n${result.stdout}`.trim();
      throw new Error(
        `wrangler ${args.join(" ")} failed (${result.code})\n${detail}`,
      );
    }
    return result;
  }
}

function d1Args(extra) {
  return [
    "d1",
    "execute",
    "aura-dev",
    "--local",
    "--env",
    "dev",
    "--persist-to",
    persistTo,
    "--json",
    ...extra,
  ];
}

function parseJson(stdout) {
  const start = stdout.search(/[[{]/);
  if (start < 0) {
    throw new Error(`No JSON in wrangler output:\n${stdout}`);
  }
  return JSON.parse(stdout.slice(start));
}

function rowsFrom(payload) {
  const blocks = Array.isArray(payload) ? payload : [payload];
  const rows = [];
  for (const block of blocks) {
    if (Array.isArray(block?.results)) rows.push(...block.results);
  }
  return rows;
}

function query(sql) {
  const result = wrangler(d1Args(["--command", sql]));
  return rowsFrom(parseJson(result.stdout));
}

function expectReject(sql, label, pattern) {
  const result = wrangler(d1Args(["--command", sql]), { allowFail: true });
  const text = `${result.stderr}\n${result.stdout}`;
  if (result.code === 0 || !pattern.test(text)) {
    failures.push(
      `${label}: expected rejection matching ${pattern}, exit ${result.code}\n${text.trim()}`,
    );
  }
}

function expectPlan(sql, label, indexNeedle) {
  const rows = query(sql);
  const detail = rows.map((row) => String(row.detail ?? "")).join("\n");
  if (!detail || /SCAN/i.test(detail) || !detail.includes(indexNeedle)) {
    failures.push(
      `${label}: expected a search using ${indexNeedle}\n${detail || "(empty plan)"}`,
    );
  }
}

wrangler([
  "d1",
  "migrations",
  "apply",
  "aura-dev",
  "--local",
  "--env",
  "dev",
  "--persist-to",
  persistTo,
]);

const fk = query("PRAGMA foreign_keys;");
const fkOn = fk.some((row) => Number(row.foreign_keys ?? row["foreign_keys"]) === 1);
if (!fkOn) {
  failures.push(`PRAGMA foreign_keys is off: ${JSON.stringify(fk)}`);
}

const names = query(
  "SELECT name FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name;",
).map((row) => row.name);

for (const required of [
  "studios",
  "studio_members",
  "users",
  "auth_sessions",
  "projects",
  "project_sessions",
  "galleries",
  "photos",
  "comments",
  "gallery_favorites",
  "sub_albums",
  "proposals",
  "booking_requests",
  "payment_transactions",
  "invoices",
  "payment_links",
  "contracts",
  "contract_templates",
  "questionnaire_responses",
  "questionnaire_templates",
  "contact_messages",
  "notifications",
  "analytics_events",
  "rate_limits",
  "email_outbox",
  "watermark_jobs",
  "deleted_docs",
  "homepage_slugs",
  "idempotency_keys",
  "package_templates",
  "watermark_presets",
  "idea_cards",
  "shot_list_templates",
  "shoot_plans",
  "session_types",
  "idx_users_email",
  "idx_galleries_public_token",
  "idx_photos_gallery_sort",
  "idx_analytics_studio_time",
  "idx_payment_transactions_stripe_checkout",
  "idx_payment_transactions_stripe_payment_intent",
  "idx_invoices_stripe_checkout",
  "idx_invoices_stripe_payment_intent",
]) {
  if (!names.includes(required)) failures.push(`missing ${required}`);
}

expectReject(
  `INSERT INTO photos (id, studio_id, gallery_id, sort_order, body)
   VALUES ('photo_bad', 'studio_1', 'gallery_missing', 0, '{}');`,
  "photo → gallery",
  /FOREIGN KEY constraint failed/i,
);

expectReject(
  `INSERT INTO project_sessions (id, studio_id, project_id, body)
   VALUES ('session_bad', 'studio_1', 'project_missing', '{}');`,
  "session → project",
  /FOREIGN KEY constraint failed/i,
);

expectReject(
  `INSERT INTO studio_members (uid, email, studio_id, role, created_at, body)
   VALUES ('uid_bad', 'a@example.com', 'studio_missing', 'owner', '2026-11-04T00:00:00.000Z', '{}');`,
  "member → studio",
  /FOREIGN KEY constraint failed/i,
);

query(`
  INSERT INTO studios (id, name, owner_email, created_at, updated_at, body)
  VALUES ('studio_1', 'Aura', 'owner@example.com', '2026-11-04T00:00:00.000Z', '2026-11-04T00:00:00.000Z', '{}');
  INSERT INTO studio_members (uid, email, studio_id, role, created_at, body)
  VALUES ('uid_1', 'owner@example.com', 'studio_1', 'owner', '2026-11-04T00:00:00.000Z', '{}');
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES ('user_1', 'owner@example.com', '2026-11-04T00:00:00.000Z', '2026-11-04T00:00:00.000Z');
  INSERT INTO projects (id, studio_id, body) VALUES ('project_1', 'studio_1', '{}');
  INSERT INTO project_sessions (id, studio_id, project_id, body)
  VALUES ('ps_1', 'studio_1', 'project_1', '{}');
  INSERT INTO galleries (id, studio_id, public_token, body)
  VALUES ('gallery_1', 'studio_1', 'public-token-1', '{}');
  INSERT INTO photos (id, studio_id, gallery_id, sort_order, body)
  VALUES ('photo_1', 'studio_1', 'gallery_1', 1, '{}');
  INSERT INTO auth_sessions (token, uid, email, studio_id, expires_at, body)
  VALUES ('token_1', 'uid_1', 'owner@example.com', 'studio_1', '2026-11-05T00:00:00.000Z', '{}');
  INSERT INTO analytics_events (id, studio_id, at, body)
  VALUES ('event_1', 'studio_1', '2026-11-04T00:00:00.000Z', '{}');
  INSERT INTO homepage_slugs (slug, studio_id, updated_at, body)
  VALUES ('hana', 'studio_1', '2026-11-04T00:00:00.000Z', '{}');
  INSERT INTO idempotency_keys (scope, key, status, response_json, created_at, expires_at)
  VALUES ('email', 'key_1', 200, '{}', '2026-11-04T00:00:00.000Z', '2026-11-04T00:15:00.000Z');
  INSERT INTO payment_transactions (id, studio_id, stripe_checkout_session_id, stripe_payment_intent_id, body)
  VALUES ('pay_1', 'studio_1', 'cs_1', 'pi_1', '{}');
  INSERT INTO invoices (id, studio_id, stripe_checkout_session_id, stripe_payment_intent_id, body)
  VALUES ('inv_1', 'studio_1', 'cs_1', 'pi_1', '{}');
`);

expectReject(
  `INSERT INTO photos (id, studio_id, gallery_id, sort_order, body)
   VALUES ('photo_bad_2', 'studio_1', 'gallery_missing', 2, '{}');`,
  "photo → gallery after parents exist",
  /FOREIGN KEY constraint failed/i,
);

expectReject(
  "DELETE FROM galleries WHERE id = 'gallery_1';",
  "delete gallery with a photo",
  /FOREIGN KEY constraint failed/i,
);

expectReject(
  "DELETE FROM projects WHERE id = 'project_1';",
  "delete project with a session",
  /FOREIGN KEY constraint failed/i,
);

expectReject(
  "DELETE FROM studios WHERE id = 'studio_1';",
  "delete studio with a member",
  /FOREIGN KEY constraint failed/i,
);

expectReject(
  `INSERT INTO galleries (id, studio_id, public_token, body)
   VALUES ('gallery_2', 'studio_1', 'public-token-1', '{}');`,
  "gallery public token",
  /UNIQUE constraint failed/i,
);

expectReject(
  `INSERT INTO users (id, email, created_at, updated_at)
   VALUES ('user_2', 'OWNER@example.com', '2026-11-04T00:00:00.000Z', '2026-11-04T00:00:00.000Z');`,
  "user email",
  /UNIQUE constraint failed/i,
);

expectReject(
  `INSERT INTO studio_members (uid, email, studio_id, role, created_at, body)
   VALUES ('uid_1', 'other@example.com', 'studio_1', 'owner', '2026-11-04T00:00:00.000Z', '{}');`,
  "member uid",
  /UNIQUE constraint failed/i,
);

expectReject(
  `INSERT INTO homepage_slugs (slug, studio_id, updated_at, body)
   VALUES ('hana', 'studio_1', '2026-11-04T00:00:00.000Z', '{}');`,
  "homepage slug",
  /UNIQUE constraint failed/i,
);

expectReject(
  `INSERT INTO idempotency_keys (scope, key, status, response_json, created_at, expires_at)
   VALUES ('email', 'key_1', 200, '{}', '2026-11-04T00:00:00.000Z', '2026-11-04T00:15:00.000Z');`,
  "idempotency key",
  /UNIQUE constraint failed/i,
);

expectReject(
  `INSERT INTO payment_transactions (id, studio_id, stripe_checkout_session_id, body)
   VALUES ('pay_2', 'studio_1', 'cs_1', '{}');`,
  "Stripe checkout id",
  /UNIQUE constraint failed/i,
);

expectReject(
  `INSERT INTO payment_transactions (id, studio_id, stripe_payment_intent_id, body)
   VALUES ('pay_3', 'studio_1', 'pi_1', '{}');`,
  "Stripe payment intent id",
  /UNIQUE constraint failed/i,
);

query(`
  INSERT INTO payment_transactions (id, studio_id, body)
  VALUES ('pay_null_a', 'studio_1', '{}');
  INSERT INTO payment_transactions (id, studio_id, body)
  VALUES ('pay_null_b', 'studio_1', '{}');
`);

expectPlan(
  "EXPLAIN QUERY PLAN SELECT id FROM galleries WHERE public_token = 'public-token-1';",
  "gallery token lookup",
  "idx_galleries_public_token",
);

expectPlan(
  "EXPLAIN QUERY PLAN SELECT id FROM photos WHERE gallery_id = 'gallery_1' ORDER BY sort_order, id LIMIT 24;",
  "photo page",
  "idx_photos_gallery_sort",
);

expectPlan(
  "EXPLAIN QUERY PLAN SELECT uid FROM auth_sessions WHERE token = 'token_1';",
  "session token lookup",
  "token",
);

expectPlan(
  "EXPLAIN QUERY PLAN SELECT id FROM analytics_events WHERE studio_id = 'studio_1' ORDER BY at;",
  "analytics by studio and time",
  "idx_analytics_studio_time",
);

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(`d1 schema check passed (${persistTo})`);
