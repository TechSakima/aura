/**
 * Drop common client signature / logo-alt noise from inbound plain text.
 * Heuristic only — not a full MIME signature parser.
 */
export function stripInboundSignatureNoise(value: string): string {
  let t = value;
  // Outlook / Word image alt leftovers
  t = t.replace(
    /\[[^\]]*(?:Description automatically generated|cid:)[^\]]*\]/gi,
    "",
  );
  t = t.replace(/\[[^\]]{0,60}\b(?:logo|image)\b[^\]]{0,60}\]/gi, "");
  // RFC 3676 signature delimiter
  const dash = t.search(/\n-- \s*\n/);
  if (dash >= 0) t = t.slice(0, dash);
  // Mobile / Outlook footers
  for (const re of [
    /\nSent from my [\s\S]+$/i,
    /\nGet Outlook for [\s\S]+$/i,
    /\n_{2,}\s*\n[\s\S]*$/i,
  ]) {
    const m = t.search(re);
    if (m >= 0) t = t.slice(0, m);
  }
  return t
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}
