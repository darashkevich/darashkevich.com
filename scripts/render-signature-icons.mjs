#!/usr/bin/env node
/** Render 128x128 PNG icons from SVG (displayed at 28px in signatures).
 *  Glyph scale in SVGs: stroke icons 2.85×, LinkedIn badge 2.58× (Simple Icons mark).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(__dirname, "..", "public", "signature", "icons");
const RENDER_SIZE = 128;
const ICONS = ["email", "phone", "linkedin", "website"];

for (const name of ICONS) {
  const svgPath = join(ICON_DIR, `${name}.svg`);
  const outPath = join(ICON_DIR, `${name}.png`);
  const svg = readFileSync(svgPath);
  await sharp(svg, { density: 512 })
    .resize(RENDER_SIZE, RENDER_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);
  const { size } = await import("node:fs/promises").then((fs) => fs.stat(outPath));
  console.log(`  ${name}.png: ${size} bytes (${RENDER_SIZE}x${RENDER_SIZE})`);
}

console.log(`Icons written to ${ICON_DIR}`);
