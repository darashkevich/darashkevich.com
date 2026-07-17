#!/usr/bin/env node
/**
 * Post-build smoke test for the production bundle in dist/.
 *
 * Guards against the class of bug where interactions work in `astro dev`
 * but die in production because the CSP (script-src 'self', no
 * 'unsafe-inline') blocks inline <script> blocks that Astro/Vite inlined
 * into the HTML.
 *
 * Checks:
 *   1. dist/index.html contains no inline module scripts (CSP would block them).
 *   2. Critical interactive markup exists (Selected Impact tiles, CX OS stages).
 *   3. The bundled JS that wires those interactions exists in dist/_assets.
 *   4. Functional (jsdom): clicking an impact tile sets aria-expanded="true";
 *      clicking a CX OS stage updates the live caption.
 *
 * Usage: npm run smoke   (after npm run build)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { JSDOM } from 'jsdom';

const distDir = resolve(import.meta.dirname, '../dist');
const indexPath = join(distDir, 'index.html');

let failures = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};

if (!existsSync(indexPath)) {
  console.error(`dist/index.html not found — run \`npm run build\` first.`);
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');

console.log('1. CSP compatibility (no inline module scripts in dist/index.html)');
{
  // Inline <script type="module"> without src would be blocked by the
  // production CSP (script-src 'self', no 'unsafe-inline').
  const inlineModules = [...html.matchAll(/<script\s+type="module"(?![^>]*\bsrc=)[^>]*>/g)];
  if (inlineModules.length === 0) {
    pass('all module scripts are external files');
  } else {
    fail(
      `${inlineModules.length} inline <script type="module"> block(s) found — ` +
        `production CSP will block these. Check vite.build.assetsInlineLimit in astro.config.mjs.`
    );
  }
}

console.log('2. Critical interactive markup present');
for (const selectorMarker of ['data-impact-trigger', 'data-impact-panel', 'data-cx-os', 'data-interactive-stage', 'data-cx-os-live']) {
  if (html.includes(selectorMarker)) pass(selectorMarker);
  else fail(`missing ${selectorMarker} in dist/index.html`);
}

console.log('3. Event-binding scripts shipped in dist');
const scriptSrcs = [...html.matchAll(/<script\s+type="module"\s+src="([^"]+)"/g)].map((m) => m[1]);
const scriptContents = [];
for (const src of scriptSrcs) {
  const filePath = join(distDir, src.replace(/^\//, ''));
  if (!existsSync(filePath)) {
    fail(`referenced script missing from dist: ${src}`);
    continue;
  }
  scriptContents.push(readFileSync(filePath, 'utf8'));
}
for (const [label, marker] of [
  ['Selected Impact bindings', 'data-impact-trigger'],
  ['CX Operating System bindings', 'data-cx-os'],
]) {
  if (scriptContents.some((c) => c.includes(marker))) pass(label);
  else fail(`${label}: no bundled script references "${marker}"`);
}

console.log('4. Functional checks (jsdom)');
try {
  const dom = new JSDOM(html, {
    url: 'https://darashkevich.com/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const { document } = window;

  // jsdom has no matchMedia; report "no hover" so the impact tiles use the
  // click-to-toggle path (same as touch devices).
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  // The bundled component scripts have no imports, so they can run directly
  // in the window context (jsdom does not execute type="module" natively).
  for (const code of scriptContents) window.eval(code);

  // Selected Impact: click first tile trigger → expanded
  const trigger = document.querySelector('[data-impact-trigger]');
  if (!trigger) {
    fail('no [data-impact-trigger] element to click');
  } else {
    trigger.click();
    if (trigger.getAttribute('aria-expanded') === 'true') {
      pass('impact tile click sets aria-expanded="true"');
    } else {
      fail(`impact tile click did not expand (aria-expanded=${trigger.getAttribute('aria-expanded')})`);
    }
  }

  // CX OS: click a stage button → live caption changes
  const live = document.querySelector('[data-cx-os-live]');
  const stage = document.querySelector('button[data-interactive-stage]');
  if (!live || !stage) {
    fail('missing CX OS stage button or live caption element');
  } else {
    const before = live.textContent.trim();
    stage.click();
    const after = live.textContent.trim();
    if (after !== before && after.includes(stage.dataset.title ?? '')) {
      pass('CX OS stage click updates the caption');
    } else {
      fail(`CX OS caption did not update on stage click (still: "${after.slice(0, 60)}…")`);
    }
  }

  window.close();
} catch (err) {
  fail(`jsdom functional check crashed: ${err.message}`);
}

if (failures > 0) {
  console.error(`\nSmoke test FAILED: ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nSmoke test passed.');
