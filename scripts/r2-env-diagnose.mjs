/**
 * Diagnose R2_* lengths / odd chars without printing secret values.
 *   node scripts/r2-env-diagnose.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const path = resolve(process.cwd(), ".env.local");
if (!existsSync(path)) {
  console.error("Missing .env.local");
  process.exit(1);
}

for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  if (!line.trim().startsWith("R2_")) continue;
  const eq = line.indexOf("=");
  const key = line.slice(0, eq).trim();
  const raw = line.slice(eq + 1);
  let val = raw.trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  const nonAlnum = [...val]
    .filter((c) => !/[A-Za-z0-9_-]/.test(c))
    .map((c) => `U+${c.charCodeAt(0).toString(16)}`);
  const first = val.charCodeAt(0);
  const last = val.charCodeAt(val.length - 1);
  console.log(
    `${key}: len=${val.length} rawLen=${raw.length} first=U+${first.toString(16)} last=U+${last.toString(16)} nonAlnum=[${nonAlnum.join(",")}]`,
  );
}
