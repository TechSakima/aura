import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";

const out = path.join(process.cwd(), "public");
await mkdir(out, { recursive: true });

function markSvg(size, fontScale = 0.42) {
  return `
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1c1915"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, serif" font-size="${size * fontScale}" fill="#f3efe6">A</text>
  </svg>`;
}

async function icon(size, file, fontScale = 0.42) {
  await sharp(Buffer.from(markSvg(size, fontScale)))
    .png()
    .toFile(path.join(out, file));
}

/** Maskable: mark in ~80% safe zone on brand canvas. */
async function maskable(size, file) {
  const inner = Math.round(size * 0.8);
  const pad = Math.round((size - inner) / 2);
  const mark = await sharp(Buffer.from(markSvg(inner, 0.42))).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: "#1c1915",
    },
  })
    .composite([{ input: mark, left: pad, top: pad }])
    .png()
    .toFile(path.join(out, file));
}

await icon(192, "icon-192.png");
await icon(512, "icon-512.png");
await maskable(512, "icon-512-maskable.png");
console.log("icons written: icon-192.png, icon-512.png, icon-512-maskable.png");
