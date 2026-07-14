#!/usr/bin/env node
/**
 * Generate public/og-image.png (1200×630) from the brand OG SVG.
 * Prefer regenerating after branding changes: npm run generate:og
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public', 'og-image.svg');
const outPath = join(root, 'public', 'og-image.png');

const png = await sharp(svgPath)
  .resize(1200, 630, { fit: 'cover' })
  .png({ quality: 90, compressionLevel: 9 })
  .toBuffer();

writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${png.length} bytes)`);
