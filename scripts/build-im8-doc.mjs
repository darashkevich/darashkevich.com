#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocument } from '../deliverables/im8-cx-challenge/render.mjs';
import { inlineIm8Assets } from './inline-im8-assets.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const challengeDir = path.join(root, 'deliverables/im8-cx-challenge');

const contentPath = process.argv[2] || path.join(challengeDir, 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const css = fs.readFileSync(path.join(challengeDir, 'styles.css'), 'utf8');

let html = renderDocument(content);
const inlined = inlineIm8Assets(html, css, challengeDir);

html = inlined.html.replace(
  '<link rel="stylesheet" href="styles.css" />',
  `<style>${inlined.css}</style>`
);

const outPath = path.join(challengeDir, 'index.html');
fs.writeFileSync(outPath, html);
console.log(`Built ${outPath}`);
