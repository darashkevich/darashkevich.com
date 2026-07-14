#!/usr/bin/env node
/**
 * Optionally emit public/BingSiteAuth.xml when PUBLIC_BING_SITE_VERIFICATION is set.
 * Google/Bing meta tags are injected by Layout.astro from the same env vars.
 * Do not invent codes — leave unset until GSC/Bing Webmaster provide them.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filename) {
  const path = join(root, filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const code = (process.env.PUBLIC_BING_SITE_VERIFICATION || '').trim();
const outPath = join(root, 'public', 'BingSiteAuth.xml');

if (!code) {
  if (existsSync(outPath)) {
    unlinkSync(outPath);
    console.log('Removed public/BingSiteAuth.xml (PUBLIC_BING_SITE_VERIFICATION unset)');
  } else {
    console.log('Skipping BingSiteAuth.xml (PUBLIC_BING_SITE_VERIFICATION unset)');
  }
  process.exit(0);
}

const xml = `<?xml version="1.0"?>
<users>
\t<user>${code}</user>
</users>
`;
writeFileSync(outPath, xml);
console.log('Wrote public/BingSiteAuth.xml from PUBLIC_BING_SITE_VERIFICATION');
