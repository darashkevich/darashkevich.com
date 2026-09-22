#!/usr/bin/env node
/**
 * Monochrome brand marks for the homepage strip.
 * Treats the corner color as the plate background and redraws the remaining
 * mark in one light tone so mixed logo plates sit quietly on the dark page.
 *
 * Usage: node ./scripts/build-brand-marks.mjs
 */
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname;
const srcDir = join(root, 'public/images/brands');
const outDir = join(srcDir, 'mono');
const MARK = [231, 237, 245];

mkdirSync(outDir, { recursive: true });

function backgroundColor(data, width, height) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
    [Math.floor(width / 2), height - 3],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [r / points.length, g / points.length, b / points.length];
}

for (const file of readdirSync(srcDir).filter((name) => name.endsWith('.webp'))) {
  const input = sharp(join(srcDir, file));
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const [br, bg, bb] = backgroundColor(data, width, height);
  const out = Buffer.alloc(width * height * 4);

  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const dist = Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb);
    const alpha = Math.max(0, Math.min(255, (dist - 22) * 3.4));
    out[i] = MARK[0];
    out[i + 1] = MARK[1];
    out[i + 2] = MARK[2];
    out[i + 3] = Math.round(alpha);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 12 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(outDir, file));

  console.log('wrote', file);
}
