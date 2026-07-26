import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";

const out = path.join(process.cwd(), "public");
await mkdir(out, { recursive: true });

async function icon(size, file) {
  const svg = `
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1c1915"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, serif" font-size="${size * 0.42}" fill="#f3efe6">A</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(out, file));
}

await icon(192, "icon-192.png");
await icon(512, "icon-512.png");
console.log("icons written");
