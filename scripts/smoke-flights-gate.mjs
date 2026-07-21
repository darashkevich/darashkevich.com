#!/usr/bin/env node
/**
 * Smoke tests for /flights Basic-auth helpers + optional live URL check.
 *
 * Always runs pure helper assertions (no network).
 * If FLIGHTS_SMOKE_BASE_URL is set, also verifies:
 *   - unauthenticated /flights/ → 401 + WWW-Authenticate
 *   - homepage → 200
 * Optionally FLIGHTS_PAGE_PASSWORD for a successful authenticated fetch.
 */

import assert from 'node:assert/strict';
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

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isAuthorized(authHeader, expectedPassword) {
  if (!expectedPassword) return false;
  const provided = parsePassword(authHeader);
  return Boolean(provided && safeEqual(provided, expectedPassword));
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

console.log('4. Source contains fail-closed gate + wrangler routing');
{
  const gate = readFileSync(join(__dirname, '../workers/flights-gate.ts'), 'utf8');
  const wrangler = readFileSync(join(__dirname, '../wrangler.jsonc'), 'utf8');
  if (!gate.includes('if (!expected)')) fail('gate missing fail-closed secret check');
  else pass('Worker denies when secret missing');
  if (!wrangler.includes('run_worker_first')) fail('wrangler missing run_worker_first');
  else if (!wrangler.includes('"/flights"') || !wrangler.includes('"/flights/*"')) {
    fail('wrangler run_worker_first must cover /flights and /flights/*');
  } else pass('run_worker_first covers /flights paths');
}

const base = process.env.FLIGHTS_SMOKE_BASE_URL?.replace(/\/$/, '');
if (base) {
  console.log(`5. Live checks against ${base}`);
  const unauth = await fetch(`${base}/flights/`, { redirect: 'manual' });
  if (unauth.status !== 401) {
    fail(`unauthenticated /flights/ expected 401, got ${unauth.status}`);
  } else if (!unauth.headers.get('www-authenticate')?.toLowerCase().includes('basic')) {
    fail('unauthenticated /flights/ missing WWW-Authenticate: Basic');
  } else {
    pass('unauthenticated /flights/ → 401');
  }

  const home = await fetch(`${base}/`, { redirect: 'manual' });
  if (home.status !== 200) fail(`homepage expected 200, got ${home.status}`);
  else pass('homepage → 200');

  const password = process.env.FLIGHTS_PAGE_PASSWORD;
  if (password) {
    const token = Buffer.from(`smoke:${password}`, 'utf8').toString('base64');
    const authed = await fetch(`${base}/flights/`, {
      headers: { Authorization: `Basic ${token}` },
      redirect: 'manual',
    });
    if (authed.status !== 200) fail(`authenticated /flights/ expected 200, got ${authed.status}`);
    else pass('authenticated /flights/ → 200');
  } else {
    console.log('  · skip authed fetch (set FLIGHTS_PAGE_PASSWORD to enable)');
  }
} else {
  console.log('5. Live URL checks skipped (set FLIGHTS_SMOKE_BASE_URL to enable)');
}

if (process.exitCode) {
  console.error('\nFlights gate smoke failed.');
  process.exit(1);
}

console.log('\nFlights gate smoke passed.');
