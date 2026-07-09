#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = process.cwd();
const flightsPath = path.join(root, 'src/data/flights.ts');
const maxReturnWindowDays = 120;
const maxRoundTripGapDays = 30;

const roundTripPairs = [
  ['MSQ', 'BOS'],
  ['MSQ', 'CDG'],
  ['MSQ', 'IST'],
  ['TBS', 'IST'],
  ['TBS', 'WAW'],
  ['TBS', 'MSQ'],
  ['WAW', 'LIS'],
  ['WAW', 'TBS'],
  ['BOS', 'LIS'],
  ['LIS', 'MAD'],
  ['LIS', 'WAW']
];

async function importTypeScriptModule(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const tempPath = path.join(os.tmpdir(), `flight-check-${Date.now()}.mjs`);
  await fs.writeFile(tempPath, transpiled, 'utf8');

  try {
    return await import(pathToFileURL(tempPath).href);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

function routeKey(origin, destination) {
  return `${origin ?? '?'}→${destination ?? '?'}`;
}

function daysBetween(a, b) {
  const ms = Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`);
  return Math.round(ms / 86_400_000);
}

function parseClock(value) {
  if (!value) return null;
  const trimmed = value.trim();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]) % 12;
    if (ampm[3].toUpperCase() === 'PM') hours += 12;
    return hours * 60 + Number(ampm[2]);
  }
  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) return Number(twentyFour[1]) * 60 + Number(twentyFour[2]);
  return null;
}

function parseArrivalDate(arrivalTime, departureDate) {
  if (!arrivalTime) return departureDate;
  const monthMatch = arrivalTime.match(/\b(\d{1,2})\s+([A-Za-z]{3})\b/);
  if (monthMatch) {
    const year = departureDate.slice(0, 4);
    const parsed = new Date(`${monthMatch[2]} ${monthMatch[1]}, ${year}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  const dayOffset = arrivalTime.match(/^(\d{1,2})\s+([A-Za-z]{3})\b/);
  if (dayOffset) {
    const year = departureDate.slice(0, 4);
    const parsed = new Date(`${dayOffset[2]} ${dayOffset[1]}, ${year}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return departureDate;
}

function segmentLabel(segment) {
  return `${segment.id} (${segment.date} ${routeKey(segment.originCode, segment.destinationCode)}${segment.flightNumber ? ` ${segment.flightNumber}` : ''})`;
}

const { flightSegments, unresolvedFlights } = await importTypeScriptModule(flightsPath);
const segments = [...flightSegments, ...unresolvedFlights];

const findings = {
  duplicates: [],
  missingReturns: [],
  missingOutbounds: [],
  bookingGaps: [],
  connectionTiming: [],
  overnightDateHints: [],
  partialDuplicates: []
};

const byRouteDate = new Map();
for (const segment of segments) {
  const key = `${segment.date}|${segment.originCode}|${segment.destinationCode}|${segment.flightNumber ?? ''}|${segment.airline}`;
  const list = byRouteDate.get(key) ?? [];
  list.push(segment);
  byRouteDate.set(key, list);
}

for (const [key, list] of byRouteDate.entries()) {
  if (list.length > 1) {
    findings.duplicates.push({
      key,
      ids: list.map((segment) => segment.id)
    });
  }
}

const coded = segments.filter((segment) => segment.originCode && segment.destinationCode);
const outboundCandidates = coded.filter((segment) => segment.confidence !== 'unresolved');

for (const [origin, destination] of roundTripPairs) {
  const outbounds = outboundCandidates.filter(
    (segment) => segment.originCode === origin && segment.destinationCode === destination
  );
  const returns = outboundCandidates.filter(
    (segment) => segment.originCode === destination && segment.destinationCode === origin
  );

  for (const outbound of outbounds) {
    const partner = returns.find((segment) => {
      const gap = daysBetween(outbound.date, segment.date);
      return gap > 0 && gap <= maxRoundTripGapDays;
    });

    if (!partner) {
      findings.missingReturns.push({
        outbound: segmentLabel(outbound),
        expectedReturn: routeKey(destination, origin),
        windowDays: maxRoundTripGapDays
      });
    }
  }

  for (const inbound of returns) {
    const partner = outbounds.find((segment) => {
      const gap = daysBetween(segment.date, inbound.date);
      return gap > 0 && gap <= maxRoundTripGapDays;
    });

    if (!partner) {
      findings.missingOutbounds.push({
        inbound: segmentLabel(inbound),
        expectedOutbound: routeKey(origin, destination),
        windowDays: maxRoundTripGapDays
      });
    }
  }
}

for (const outbound of outboundCandidates) {
  const pair = roundTripPairs.find(
    ([origin, destination]) =>
      (outbound.originCode === origin && outbound.destinationCode === destination) ||
      (outbound.originCode === destination && outbound.destinationCode === origin)
  );
  if (pair) continue;

  const returns = outboundCandidates.filter(
    (segment) =>
      segment.originCode === outbound.destinationCode &&
      segment.destinationCode === outbound.originCode &&
      daysBetween(outbound.date, segment.date) > 0 &&
      daysBetween(outbound.date, segment.date) <= maxReturnWindowDays
  );

  if (returns.length > 0) continue;

  const hasIndirectReturn = outboundCandidates.some((segment) => {
    const gap = daysBetween(outbound.date, segment.date);
    if (gap <= 0 || gap > maxReturnWindowDays) return false;
    return segment.destinationCode === outbound.originCode;
  });
  if (hasIndirectReturn) continue;

  findings.missingReturns.push({
    outbound: segmentLabel(outbound),
    expectedReturn: routeKey(outbound.destinationCode, outbound.originCode),
    windowDays: maxReturnWindowDays
  });
}

const byBooking = new Map();
for (const segment of segments) {
  if (!segment.bookingRef) continue;
  const list = byBooking.get(segment.bookingRef) ?? [];
  list.push(segment);
  byBooking.set(segment.bookingRef, list);
}

for (const [bookingRef, legs] of byBooking.entries()) {
  const sorted = [...legs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const gap = daysBetween(current.date, next.date);
    if (current.destinationCode && next.originCode && current.destinationCode !== next.originCode && gap <= 2) {
      findings.bookingGaps.push({
        bookingRef,
        issue: `Connection airport mismatch: ${segmentLabel(current)} then ${segmentLabel(next)}`
      });
    }
    if (gap > 45) {
      findings.bookingGaps.push({
        bookingRef,
        issue: `Large gap (${gap}d) between ${segmentLabel(current)} and ${segmentLabel(next)}`
      });
    }
  }
}

const byDate = new Map();
for (const segment of coded) {
  const list = byDate.get(segment.date) ?? [];
  list.push(segment);
  byDate.set(segment.date, list);
}

for (const [date, daySegments] of byDate.entries()) {
  const sorted = [...daySegments].sort((a, b) => {
    const aDep = parseClock(a.departureTime) ?? 0;
    const bDep = parseClock(b.departureTime) ?? 0;
    return aDep - bDep;
  });

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const first = sorted[i];
    const second = sorted[i + 1];
    if (first.destinationCode !== second.originCode) continue;
    if (!first.arrivalTime || !second.departureTime) continue;

    const arrivalDate = parseArrivalDate(first.arrivalTime, first.date);
    const arrivalMinutes = parseClock(first.arrivalTime.split(/\d{1,2}\s+[A-Za-z]{3}\s+/).pop() ?? first.arrivalTime);
    const departMinutes = parseClock(second.departureTime);
    if (arrivalMinutes == null || departMinutes == null) continue;

    const sameDay = arrivalDate === second.date;
    const layoverMinutes = sameDay ? departMinutes - arrivalMinutes : null;
    if (sameDay && layoverMinutes != null && layoverMinutes < 45) {
      findings.connectionTiming.push({
        date,
        issue: `Tight or impossible connection (${layoverMinutes}m): ${segmentLabel(first)} → ${segmentLabel(second)}`
      });
    }

    if (!sameDay && arrivalDate > second.date) {
      findings.overnightDateHints.push({
        issue: `Arrival appears after next-leg date: ${segmentLabel(first)} arrives ${arrivalDate}, then ${segmentLabel(second)}`
      });
    }
  }
}

for (const partial of segments.filter((segment) => segment.confidence === 'partial')) {
  const duplicateConfirmed = coded.find(
    (segment) =>
      segment.confidence === 'confirmed' &&
      segment.date === partial.date &&
      segment.originCode === partial.originCode &&
      segment.destinationCode === partial.destinationCode
  );
  if (duplicateConfirmed) {
    findings.partialDuplicates.push({
      partial: segmentLabel(partial),
      confirmed: segmentLabel(duplicateConfirmed)
    });
    continue;
  }

  const coveredByConnection = coded.filter(
    (segment) =>
      segment.confidence === 'confirmed' &&
      segment.date === partial.date &&
      segment.originCode === partial.originCode
  );
  if (coveredByConnection.length > 0 && partial.destinationCode) {
    const reachesDestination = outboundCandidates.some((segment) => {
      if (segment.date !== partial.date) return false;
      if (segment.originCode !== partial.originCode) return false;
      if (segment.destinationCode === partial.destinationCode) return true;
      const hop = outboundCandidates.find(
        (other) =>
          other.date === segment.date &&
          other.originCode === segment.destinationCode &&
          other.destinationCode === partial.destinationCode
      );
      return Boolean(hop);
    });
    if (reachesDestination) {
      findings.partialDuplicates.push({
        partial: segmentLabel(partial),
        confirmed: coveredByConnection.map(segmentLabel).join(' + connection')
      });
    }
  }
}

function printSection(title, items, formatter = (item) => item.issue ?? JSON.stringify(item)) {
  console.log(`\n## ${title} (${items.length})`);
  if (items.length === 0) {
    console.log('None');
    return;
  }
  for (const item of items.slice(0, 40)) {
    console.log(`- ${formatter(item)}`);
  }
  if (items.length > 40) console.log(`- …and ${items.length - 40} more`);
}

console.log(`Checked ${segments.length} segments (${flightSegments.length} main + ${unresolvedFlights.length} unresolved)`);

printSection('Exact duplicates', findings.duplicates, (item) => `${item.key} → ${item.ids.join(', ')}`);
printSection(
  'Likely missing return legs',
  findings.missingReturns,
  (item) => `${item.outbound} → no ${item.expectedReturn} within ${item.windowDays}d`
);
printSection(
  'Likely missing outbound legs',
  findings.missingOutbounds,
  (item) => `${item.inbound} → no ${item.expectedOutbound} within ${item.windowDays}d before it`
);
printSection('Booking reference issues', findings.bookingGaps);
printSection('Connection timing warnings', findings.connectionTiming);
printSection('Overnight / date alignment hints', findings.overnightDateHints);
printSection('Partial records superseded by confirmed legs', findings.partialDuplicates, (item) => `${item.partial} superseded by ${item.confirmed}`);
