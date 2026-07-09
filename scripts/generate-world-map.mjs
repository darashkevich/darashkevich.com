#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoPath, geoEquirectangular } from 'd3-geo';
import { MAP_WIDTH, MAP_HEIGHT } from './map-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const width = MAP_WIDTH;
const height = MAP_HEIGHT;
const maxSouthLat = -58;
const scale = width / (2 * Math.PI);
const southY = height / 2 + scale * (((-maxSouthLat) * Math.PI) / 180);

function makePath(precision) {
  const proj = geoEquirectangular()
    .scale(scale)
    .translate([width / 2, height / 2])
    .clipExtent([[0, 0], [width, southY]]);
  if (precision !== null) proj.precision(precision);
  return geoPath(proj);
}

function readTopo(file) {
  return JSON.parse(readFileSync(join(root, 'node_modules/world-atlas', file), 'utf8'));
}

function countryPaths(topoFile, path, { borders = false } = {}) {
  const topo = readTopo(topoFile);
  const countries = feature(topo, topo.objects.countries);
  const strokeFixed = 'vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision"';
  return countries.features
    .filter((f) => f.id !== '010')
    .map((f) => {
      const d = path(f);
      if (!d) return '';
      if (borders) {
        return `<path d="${d}" fill="none" stroke="var(--color-border)" stroke-opacity="0.38" stroke-width="0.35" stroke-linejoin="round" stroke-linecap="round" ${strokeFixed}/>`;
      }
      return `<path d="${d}"/>`;
    })
    .filter(Boolean)
    .join('\n    ');
}

function graticuleLines(step, path) {
  const project = path.projection();
  const lines = [];
  for (let lat = -60; lat <= 60; lat += step) {
    if (lat < maxSouthLat) continue;
    const y = project([0, lat])[1];
    if (Number.isFinite(y)) {
      lines.push(`<line x1="0" y1="${y.toFixed(3)}" x2="${width}" y2="${y.toFixed(3)}"/>`);
    }
  }
  for (let lon = -180 + step; lon < 180; lon += step) {
    const x = project([lon, 0])[0];
    if (Number.isFinite(x)) {
      lines.push(`<line x1="${x.toFixed(3)}" y1="0" x2="${x.toFixed(3)}" y2="${height}"/>`);
    }
  }
  return lines;
}

function layerFragment({
  countryFile,
  graticuleStep,
  landStroke = true,
  includeBorders = false,
  precision = 0.08
}) {
  const path = makePath(precision);
  const graticule = graticuleLines(graticuleStep, path).join('\n    ');
  const landStrokeAttrs = landStroke
    ? 'stroke="var(--color-border)" stroke-opacity="0.38" stroke-width="0.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"'
    : 'stroke="none"';
  const borders = includeBorders
    ? `<g class="world-borders">\n    ${countryPaths(countryFile, path, { borders: true })}\n  </g>`
    : '';

  return `<g class="world-land" fill="var(--color-text-muted)" fill-opacity="0.1" ${landStrokeAttrs} shape-rendering="geometricPrecision">
    ${countryPaths(countryFile, path)}
  </g>
  ${borders}
  <g class="world-graticule" fill="none" stroke="var(--color-border)" stroke-opacity="0.12" stroke-width="0.35" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision">
    ${graticule}
  </g>`;
}

const outDir = join(root, 'public/images');
mkdirSync(outDir, { recursive: true });

const overview = layerFragment({
  countryFile: 'countries-110m.json',
  graticuleStep: 30,
  landStroke: true,
  precision: 0.08
});

/** Natural Earth 10m — finest resolution available in world-atlas. */
const detail = layerFragment({
  countryFile: 'countries-10m.json',
  graticuleStep: 10,
  landStroke: false,
  includeBorders: true,
  precision: 0
});

writeFileSync(join(outDir, 'world-map-110m.svg'), overview, 'utf8');
writeFileSync(join(outDir, 'world-map-10m.svg'), detail, 'utf8');
writeFileSync(
  join(outDir, 'world-map.svg'),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
  ${overview}
</svg>`,
  'utf8'
);

console.log('Wrote public/images/world-map-110m.svg');
console.log('Wrote public/images/world-map-10m.svg');
console.log('Wrote public/images/world-map.svg');
