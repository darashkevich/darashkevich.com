#!/usr/bin/env node
/**
 * Generate Open Graph PNGs (1200×630) from brand OG SVG templates.
 * Usage: npm run generate:og
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const variants = [
  {
    name: 'home',
    out: join(root, 'public', 'og-image.png'),
    svg: join(root, 'public', 'og-image.svg'),
  },
  {
    name: 'resume',
    out: join(root, 'public', 'og-resume.png'),
    svg: join(root, 'public', 'og-resume.svg'),
  },
];

for (const variant of variants) {
  const png = await sharp(variant.svg)
    .resize(1200, 630, { fit: 'cover' })
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(variant.out, png);
  console.log(`Wrote ${variant.out} (${png.length} bytes)`);
}
