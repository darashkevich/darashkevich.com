#!/usr/bin/env node
/**
 * Light brand marks for the homepage strip.
 *
 * Knocks the plate color out to transparency and redraws the remaining ink
 * in one light tone. A few plates need extra rules: RotoQL's "QL" is white
 * type knocked out of a blue field, and Judith Bright's source includes a
 * paragraph that is not part of the mark.
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

function cornerColor(data, width, height) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
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

function isNearWhite(r, g, b) {
  return r > 176 && g > 176 && b > 176 && Math.abs(r - b) < 48;
}

/** White "Roto" plus the white "QL" knocked out of the blue field. */
function rotoInk(r, g, b) {
  return isNearWhite(r, g, b) ? 255 : 0;
}

function plateInk(br, bg, bb) {
  return (r, g, b) => {
    const dist = Math.hypot(r - br, g - bg, b - bb);
    if (dist < 26) return 0;
    if (dist > 48) return 255;
    return Math.round(((dist - 26) / 22) * 255);
  };
}

async function loadRaw(file, extract) {
  let pipeline = sharp(join(srcDir, file)).ensureAlpha();
  if (extract) pipeline = pipeline.extract(extract);
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function load(file) {
  if (file === 'picJB.webp') {
    // Seal only. The source plate continues into a paragraph of body text.
    return loadRaw(file, { left: 130, top: 0, width: 155, height: 78 });
  }
  return loadRaw(file);
}

/** Icon sits above the word. Place them side by side so the name stays readable. */
async function layoutKiwi(iconPng, wordPng) {
  const wordMeta = await sharp(wordPng).metadata();
  const icon = await sharp(iconPng)
    .resize({ height: wordMeta.height, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const iconMeta = await sharp(icon).metadata();
  const gap = Math.round(wordMeta.height * 0.18);
  const width = iconMeta.width + gap + wordMeta.width;
  return sharp({
    create: {
      width,
      height: wordMeta.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: icon, left: 0, top: 0 },
      { input: wordPng, left: iconMeta.width + gap, top: 0 },
    ])
    .webp({ lossless: true, quality: 100, alphaQuality: 100 })
    .toFile(join(outDir, 'picKiwiCo.webp'));
}

function raster(data, width, height, ink) {
  const out = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const alpha = ink(data[i], data[i + 1], data[i + 2]);
    if (alpha < 8) continue;
    out[i] = MARK[0];
    out[i + 1] = MARK[1];
    out[i + 2] = MARK[2];
    out[i + 3] = alpha;
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

for (const file of readdirSync(srcDir).filter((name) => name.endsWith('.webp'))) {
  if (file === 'picKiwiCo.webp') {
    const [br, bg, bb] = [255, 255, 255];
    const ink = plateInk(br, bg, bb);
    const icon = await loadRaw(file, { left: 150, top: 0, width: 120, height: 70 });
    const word = await loadRaw(file, { left: 90, top: 74, width: 240, height: 51 });
    await layoutKiwi(
      await raster(icon.data, icon.width, icon.height, ink),
      await raster(word.data, word.width, word.height, ink),
    );
    console.log('wrote', file);
    continue;
  }

  const { data, width, height } = await load(file);
  const ink = file === 'picRotoQL.webp'
    ? rotoInk
    : plateInk(...cornerColor(data, width, height));
  const png = await raster(data, width, height, ink);
  await sharp(png).webp({ lossless: true, quality: 100, alphaQuality: 100 }).toFile(join(outDir, file));
  console.log('wrote', file);
}
