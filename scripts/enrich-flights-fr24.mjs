#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = process.cwd();
const flightsPath = path.join(root, 'src/data/flights.ts');
const enrichmentPath = path.join(root, 'src/data/flight-enrichment.ts');
const endpoint = 'https://fr24api.flightradar24.com/api/flight-summary/full';

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value = 'true'] = arg.slice(2).split('=');
      return [key, value];
    })
);

async function loadDotEnv() {
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(root, filename);
    const contents = await fs.readFile(filePath, 'utf8').catch(() => '');

    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (process.env[key]) continue;

      const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  }
}

await loadDotEnv();

const token = process.env.FR24_API_TOKEN;
const limit = Number(args.get('limit') ?? '25');
const refresh = args.has('refresh');
const dryRun = args.has('dry-run');

function normalizeFlight(value) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

function isEligible(segment) {
  return Boolean(
    segment.confidence === 'confirmed' &&
      segment.flightNumber &&
      segment.originCode &&
      segment.destinationCode &&
      segment.date >= '2022-06-01'
  );
}

async function importTypeScriptModule(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const tempPath = path.join(os.tmpdir(), `fr24-${path.basename(filePath)}-${Date.now()}.mjs`);
  await fs.writeFile(tempPath, transpiled, 'utf8');

  try {
    return await import(pathToFileURL(tempPath).href);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

function pickBestMatch(segment, rows) {
  const expectedFlight = normalizeFlight(segment.flightNumber);
  const expectedOrigin = segment.originCode;
  const expectedDestination = segment.destinationCode;

  return rows
    .map((row) => {
      const origin = row.orig_iata ?? row.origin_iata;
      const destination = row.dest_iata ?? row.destination_iata;
      const actualDestination = row.dest_iata_actual ?? row.destination_iata_actual;
      let score = 0;

      if (normalizeFlight(row.flight) === expectedFlight) score += 5;
      if (origin === expectedOrigin) score += 3;
      if (destination === expectedDestination || actualDestination === expectedDestination) score += 3;

      return { row, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.row;
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== '')
  );
}

function toEnrichment(row) {
  return cleanObject({
    provider: 'fr24',
    fetchedAt: new Date().toISOString(),
    fr24Id: row.fr24_id,
    sourceEndpoint: 'flight-summary/full',
    flight: row.flight,
    callsign: row.callsign,
    operatedAs: row.operated_as,
    paintedAs: row.painted_as,
    aircraftType: row.type,
    aircraftRegistration: row.reg,
    aircraftHex: row.hex,
    originIcao: row.orig_icao ?? row.origin_icao,
    destinationIcao: row.dest_icao ?? row.destination_icao,
    destinationIataActual: row.dest_iata_actual ?? row.destination_iata_actual,
    takeoffUtc: row.datetime_takeoff,
    landingUtc: row.datetime_landed,
    firstSeenUtc: row.first_seen,
    lastSeenUtc: row.last_seen,
    flightTimeSeconds: row.flight_time,
    circleDistanceKm: row.circle_distance,
    actualDistanceKm: row.actual_distance,
    runwayTakeoff: row.runway_takeoff,
    runwayLanding: row.runway_landed,
    category: row.category
  });
}

async function fetchSummary(segment) {
  const url = new URL(endpoint);
  url.searchParams.set('flight_datetime_from', `${segment.date}T00:00:00`);
  url.searchParams.set('flight_datetime_to', `${segment.date}T23:59:59`);
  url.searchParams.set('flights', normalizeFlight(segment.flightNumber));
  url.searchParams.set('routes', `${segment.originCode}-${segment.destinationCode}`);
  url.searchParams.set('limit', '20');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Version': 'v1'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 240)}`);
  }

  const payload = await response.json();
  const row = pickBestMatch(segment, payload.data ?? []);
  return row ? toEnrichment(row) : null;
}

function renderEnrichmentFile(cache) {
  return `export type FlightEnrichmentProvider = 'fr24';

export type FlightEnrichment = {
  provider: FlightEnrichmentProvider;
  fetchedAt: string;
  fr24Id?: string;
  sourceEndpoint?: string;
  flight?: string;
  callsign?: string;
  operatedAs?: string;
  paintedAs?: string;
  aircraftType?: string;
  aircraftRegistration?: string;
  aircraftHex?: string;
  originIcao?: string;
  destinationIcao?: string;
  destinationIataActual?: string;
  takeoffUtc?: string;
  landingUtc?: string;
  firstSeenUtc?: string;
  lastSeenUtc?: string;
  flightTimeSeconds?: number;
  circleDistanceKm?: number;
  actualDistanceKm?: number;
  runwayTakeoff?: string;
  runwayLanding?: string;
  category?: string;
};

/**
 * Cached factual aviation metadata keyed by FlightSegment.id.
 *
 * Keep this separate from \`flights.ts\`: the hand-curated archive remains the
 * source of truth, while provider-derived facts can be refreshed or removed.
 *
 * Generated by: npm run flights:enrich:fr24
 */
export const flightEnrichment: Record<string, FlightEnrichment> = ${JSON.stringify(cache, null, 2)};
`;
}

async function main() {
  if (!token) {
    throw new Error('Missing FR24_API_TOKEN. Add it to your shell environment or local .env before running.');
  }

  const { flightSegments } = await importTypeScriptModule(flightsPath);
  const existing = await importTypeScriptModule(enrichmentPath).catch(() => ({ flightEnrichment: {} }));
  const cache = { ...(existing.flightEnrichment ?? {}) };
  const candidates = flightSegments.filter(isEligible).filter((segment) => refresh || !cache[segment.id]).slice(0, limit);

  if (candidates.length === 0) {
    console.log('No eligible segments need FR24 enrichment.');
    return;
  }

  let changed = 0;
  for (const segment of candidates) {
    const label = `${segment.id} ${segment.flightNumber} ${segment.originCode}-${segment.destinationCode}`;
    try {
      const enrichment = await fetchSummary(segment);
      if (!enrichment) {
        console.log(`miss  ${label}`);
        continue;
      }

      cache[segment.id] = enrichment;
      changed += 1;
      console.log(`hit   ${label}`);
    } catch (error) {
      console.warn(`error ${label}`);
      console.warn(`      ${error.message}`);
    }
  }

  if (changed === 0) {
    console.log('No new enrichment records found.');
    return;
  }

  if (dryRun) {
    console.log(`Dry run: would write ${changed} new enrichment records.`);
    return;
  }

  await fs.writeFile(enrichmentPath, renderEnrichmentFile(cache), 'utf8');
  console.log(`Wrote ${changed} new enrichment records to ${path.relative(root, enrichmentPath)}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
