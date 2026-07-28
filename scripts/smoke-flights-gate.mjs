#!/usr/bin/env node
/**
 * Smoke tests for /flights Basic-auth helpers + live URL checks.
 *
 * Always runs pure helper assertions (no network), including fail-closed
 * checks for both workers/flights-gate.ts and the Netlify edge gate.
 *
 * By default also live-checks https://darashkevich.com:
 *   - unauthenticated /flights/ → 401 + WWW-Authenticate
 *   - homepage → 200
 * Set FLIGHTS_SMOKE_SKIP_LIVE=1 to skip network checks (offline/local).
 * Set FLIGHTS_SMOKE_BASE_URL for an extra host (workers.dev / Netlify).
 * Optionally FLIGHTS_PAGE_PASSWORD for a successful authenticated fetch.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  process.exitCode = 1;
}

/** Mirror of workers/flights-auth.ts for Node smoke (no TS loader required). */
function parsePassword(authHeader) {
  if (!authHeader?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    return colon >= 0 ? decoded.slice(colon + 1) : null;
  } catch {
    return null;
  }
}

function safeEqualSync(a, b) {
  // Mirror workers/flights-auth.ts: compare SHA-256 digests (fixed length).
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  let mismatch = 0;
  for (let i = 0; i < ha.length; i++) mismatch |= ha[i] ^ hb[i];
  return mismatch === 0;
}

function isAuthorized(authHeader, expectedPassword) {
  if (!expectedPassword) return false;
  const provided = parsePassword(authHeader);
  return Boolean(provided && safeEqualSync(provided, expectedPassword));
}

function isFlightsPath(pathname) {
  return (
    pathname === '/flights' ||
    pathname === '/flights/' ||
    pathname.startsWith('/flights/')
  );
}

function unauthorizedResponse(body = 'Authentication required.') {
  return new Response(body, {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Flights (private)", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

console.log('1. Flights path matching');
for (const [path, expected] of [
  ['/flights', true],
  ['/flights/', true],
  ['/flights/index.html', true],
  ['/flights/extra', true],
  ['/', false],
  ['/resume/', false],
  ['/flightsome', false],
]) {
  const got = isFlightsPath(path);
  if (got === expected) pass(`${path} → ${expected}`);
  else fail(`${path}: expected ${expected}, got ${got}`);
}

console.log('2. Basic-auth password parsing / comparison');
{
  const token = Buffer.from('anyone:s3cret', 'utf8').toString('base64');
  assert.equal(parsePassword(`Basic ${token}`), 's3cret');
  assert.equal(parsePassword(null), null);
  assert.equal(isAuthorized(`Basic ${token}`, 's3cret'), true);
  assert.equal(isAuthorized(`Basic ${token}`, 'wrong'), false);
  assert.equal(isAuthorized(`Basic ${token}`, ''), false);
  assert.equal(isAuthorized(null, 's3cret'), false);
  pass('parse + authorize behavior');
}

console.log('3. Unauthorized response shape');
{
  const res = unauthorizedResponse();
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.match(res.headers.get('WWW-Authenticate') || '', /Basic realm=/);
  pass('401 + WWW-Authenticate + no-store');
}

console.log('4. Source contains fail-closed gates + wrangler routing');
{
  const gate = readFileSync(join(__dirname, '../workers/flights-gate.ts'), 'utf8');
  const netlifyGate = readFileSync(
    join(__dirname, '../netlify/edge-functions/flights-gate.ts'),
    'utf8',
  );
  const wrangler = readFileSync(join(__dirname, '../wrangler.jsonc'), 'utf8');

  if (!gate.includes('if (!expected)')) fail('Worker gate missing fail-closed secret check');
  else if (/if\s*\(!expected\)\s*\{[^}]*context\.next\(/.test(gate)) {
    fail('Worker gate must not fail open via context.next() when secret missing');
  } else pass('Worker denies when secret missing');

  if (!netlifyGate.includes('if (!expected)')) {
    fail('Netlify gate missing fail-closed secret check');
  } else if (/if\s*\(!expected\)\s*\{[^}]*context\.next\(/.test(netlifyGate)) {
    fail('Netlify gate must not fail open via context.next() when secret missing');
  } else if (!netlifyGate.includes('secret missing')) {
    fail('Netlify gate should return a misconfiguration response when secret missing');
  } else pass('Netlify edge denies when secret missing');

  if (!wrangler.includes('run_worker_first')) fail('wrangler missing run_worker_first');
  else if (!wrangler.includes('"/flights"') || !wrangler.includes('"/flights/*"')) {
    fail('wrangler run_worker_first must cover /flights and /flights/*');
  } else pass('run_worker_first covers /flights paths');

  if (!gate.includes('isFlightsPath')) fail('Worker gate missing isFlightsPath defense-in-depth');
  else pass('Worker enforces isFlightsPath');

  if (!gate.includes('recordAuthFailureAndLimited') && !gate.includes('rateLimitedResponse')) {
    fail('Worker gate missing auth rate limiting');
  } else pass('Worker rate-limits failed auth');
}

/** Live bases always checked unless FLIGHTS_SMOKE_SKIP_LIVE=1. Extra hosts via FLIGHTS_SMOKE_BASE_URL. */
const liveBases = [];
if (process.env.FLIGHTS_SMOKE_SKIP_LIVE !== '1') {
  liveBases.push('https://darashkevich.com');
}
if (process.env.FLIGHTS_SMOKE_BASE_URL) {
  liveBases.push(process.env.FLIGHTS_SMOKE_BASE_URL.replace(/\/$/, ''));
}
const uniqueBases = [...new Set(liveBases)];

async function checkLiveBase(base) {
  console.log(`5. Live checks against ${base}`);
  const unauth = await fetch(`${base}/flights/`, { redirect: 'manual' });
  if (unauth.status !== 401) {
    fail(`${base}: unauthenticated /flights/ expected 401, got ${unauth.status}`);
  } else if (!unauth.headers.get('www-authenticate')?.toLowerCase().includes('basic')) {
    fail(`${base}: unauthenticated /flights/ missing WWW-Authenticate: Basic`);
  } else {
    pass(`${base}: unauthenticated /flights/ → 401`);
  }

  const home = await fetch(`${base}/`, { redirect: 'manual' });
  // Apex and www should be 200; Netlify rollback host may 200 until unpublished.
  if (home.status !== 200 && home.status !== 301 && home.status !== 302) {
    fail(`${base}: homepage expected 200/3xx, got ${home.status}`);
  } else {
    pass(`${base}: homepage → ${home.status}`);
  }

  const password = process.env.FLIGHTS_PAGE_PASSWORD;
  if (password) {
    const token = Buffer.from(`smoke:${password}`, 'utf8').toString('base64');
    const authed = await fetch(`${base}/flights/`, {
      headers: { Authorization: `Basic ${token}` },
      redirect: 'manual',
    });
    if (authed.status !== 200) fail(`${base}: authenticated /flights/ expected 200, got ${authed.status}`);
    else pass(`${base}: authenticated /flights/ → 200`);
  } else {
    console.log(`  · ${base}: skip authed fetch (set FLIGHTS_PAGE_PASSWORD to enable)`);
  }
}

if (uniqueBases.length === 0) {
  console.log('5. Live URL checks skipped (FLIGHTS_SMOKE_SKIP_LIVE=1)');
} else {
  for (const base of uniqueBases) {
    try {
      await checkLiveBase(base);
    } catch (err) {
      fail(`${base}: live check crashed: ${err.message}`);
    }
  }
}

if (process.exitCode) {
  console.error('\nFlights gate smoke failed.');
  process.exit(1);
}

console.log('\nFlights gate smoke passed.');
