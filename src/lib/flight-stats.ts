import {
  flightSegments,
  unresolvedFlights,
  type FlightConfidence,
  type FlightSegment
} from '../data/flights';

export const airportCountry: Record<string, string> = {
  SYR: 'United States',
  EWR: 'United States',
  JFK: 'United States',
  BOS: 'United States',
  HNL: 'United States',
  KOA: 'United States',
  SFO: 'United States',
  KBP: 'Ukraine',
  LWO: 'Ukraine',
  KUT: 'Georgia',
  ARN: 'Sweden',
  ZRH: 'Switzerland',
  MUC: 'Germany',
  FRA: 'Germany',
  PRG: 'Czech Republic',
  BER: 'Germany',
  MSQ: 'Belarus',
  CDG: 'France',
  AMS: 'Netherlands',
  LED: 'Russia',
  FCO: 'Italy',
  AHO: 'Italy',
  TBS: 'Georgia',
  TIA: 'Albania',
  UGS: 'Georgia',
  MSG: 'Georgia',
  DME: 'Russia',
  EVN: 'Armenia',
  WAW: 'Poland',
  SZZ: 'Poland',
  NLU: 'Mexico',
  CUN: 'Mexico',
  OAX: 'Mexico',
  GDL: 'Mexico',
  SGN: 'Vietnam',
  DAD: 'Vietnam',
  LIS: 'Portugal',
  OPO: 'Portugal',
  BIO: 'Spain',
  MAD: 'Spain',
  BCN: 'Spain',
  ATH: 'Greece',
  CHQ: 'Greece',
  HER: 'Greece',
  MLA: 'Malta',
  VCE: 'Italy',
  FNC: 'Portugal',
  IST: 'Turkey',
  SAW: 'Turkey',
  LGW: 'United Kingdom',
  LHR: 'United Kingdom',
  MAN: 'United Kingdom',
  CMN: 'Morocco',
  RAK: 'Morocco',
  LPA: 'Spain',
  MEX: 'Mexico',
  MIA: 'United States',
  DOH: 'Qatar',
  SVQ: 'Spain',
  WMI: 'Poland',
  CRL: 'Belgium',
  BGY: 'Italy',
  CAG: 'Italy',
  KRK: 'Poland',
  IEV: 'Ukraine',
  LCA: 'Cyprus',
  VNO: 'Lithuania',
  BRU: 'Belgium',
  TLV: 'Israel',
  DCA: 'United States',
  EAS: 'Spain',
  CPH: 'Denmark',
  EDI: 'United Kingdom',
  MXP: 'Italy',
  PDX: 'United States',
  PHL: 'United States',
  TFS: 'Spain'
};

function segmentKey(segment: FlightSegment): string {
  return [
    segment.date,
    segment.originCode ?? segment.originCity,
    segment.destinationCode ?? segment.destinationCity,
    segment.airline,
    segment.flightNumber ?? ''
  ].join('|');
}

export function dedupeSegments(segments: FlightSegment[]): FlightSegment[] {
  const seen = new Set<string>();
  const result: FlightSegment[] = [];

  for (const segment of segments) {
    const key = segmentKey(segment);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(segment);
  }

  return result;
}

export const allSegments = dedupeSegments([...flightSegments, ...unresolvedFlights]);
export const confirmedSegments = flightSegments.filter((s) => s.confidence === 'confirmed');
export const partialSegments = flightSegments.filter((s) => s.confidence === 'partial');

export type FlightStats = {
  confirmedCount: number;
  partialCount: number;
  unresolvedCount: number;
  firstConfirmedDate: string | null;
  lastConfirmedDate: string | null;
  totalDistanceKm: number;
  estimatedHoursInAir: number;
  estimatedDaysInAir: number;
  estimatedCo2Kg: number;
  distanceTrackedFlights: number;
  uniqueAirports: number;
  uniqueCountries: number;
  topAirline: { name: string; count: number } | null;
  topRoute: { route: string; count: number } | null;
  topHub: { code: string; city: string; count: number } | null;
};

const averagePassengerFlightSpeedKmh = 800;
const estimatedCo2KgPerPassengerKm = 0.115;

export function countryForAirportCode(code?: string): string | null {
  if (!code) return null;
  return airportCountry[code] ?? null;
}

function distanceKmBetweenAirports(originCode?: string, destinationCode?: string): number | null {
  if (!originCode || !destinationCode) return null;
  const origin = airportCoords[originCode];
  const destination = airportCoords[destinationCode];
  if (!origin || !destination) return null;

  return haversineDistanceKm(origin.lat, origin.lon, destination.lat, destination.lon);
}

export function computeFlightStats(): FlightStats {
  const confirmed = confirmedSegments;
  const dates = confirmed.map((s) => s.date).sort();
  const airports = new Set<string>();
  const countries = new Set<string>();
  const airlineCounts = new Map<string, number>();
  const routeCounts = new Map<string, number>();
  const hubCounts = new Map<string, { city: string; count: number }>();
  let totalDistanceKm = 0;
  let distanceTrackedFlights = 0;

  for (const segment of confirmed) {
    for (const code of [segment.originCode, segment.destinationCode]) {
      if (!code) continue;
      airports.add(code);
      const country = countryForAirportCode(code);
      if (country) countries.add(country);
      const hub = hubCounts.get(code) ?? { city: segment.originCode === code ? segment.originCity : segment.destinationCity, count: 0 };
      hub.count += 1;
      hubCounts.set(code, hub);
    }

    airlineCounts.set(segment.airline, (airlineCounts.get(segment.airline) ?? 0) + 1);

    if (segment.originCode && segment.destinationCode) {
      const route = `${segment.originCode} → ${segment.destinationCode}`;
      routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
    }

    const distanceKm = distanceKmBetweenAirports(segment.originCode, segment.destinationCode);
    if (distanceKm) {
      totalDistanceKm += distanceKm;
      distanceTrackedFlights += 1;
    }
  }

  const topAirlineEntry = [...airlineCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topRouteEntry = [...routeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topHubEntry = [...hubCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const estimatedHoursInAir = totalDistanceKm / averagePassengerFlightSpeedKmh;

  return {
    confirmedCount: confirmed.length,
    partialCount: partialSegments.length,
    unresolvedCount: unresolvedFlights.length,
    firstConfirmedDate: dates[0] ?? null,
    lastConfirmedDate: dates[dates.length - 1] ?? null,
    totalDistanceKm,
    estimatedHoursInAir,
    estimatedDaysInAir: estimatedHoursInAir / 24,
    estimatedCo2Kg: totalDistanceKm * estimatedCo2KgPerPassengerKm,
    distanceTrackedFlights,
    uniqueAirports: airports.size,
    uniqueCountries: countries.size,
    topAirline: topAirlineEntry ? { name: topAirlineEntry[0], count: topAirlineEntry[1] } : null,
    topRoute: topRouteEntry ? { route: topRouteEntry[0], count: topRouteEntry[1] } : null,
    topHub: topHubEntry
      ? { code: topHubEntry[0], city: topHubEntry[1].city, count: topHubEntry[1].count }
      : null
  };
}

export type YearBucket = {
  year: number;
  confirmed: number;
  partial: number;
  total: number;
};

export function groupByYear(): YearBucket[] {
  const buckets = new Map<number, YearBucket>();

  for (const segment of flightSegments) {
    const bucket = buckets.get(segment.year) ?? {
      year: segment.year,
      confirmed: 0,
      partial: 0,
      total: 0
    };
    bucket.total += 1;
    if (segment.confidence === 'confirmed') bucket.confirmed += 1;
    if (segment.confidence === 'partial') bucket.partial += 1;
    buckets.set(segment.year, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.year - b.year);
}

export type AirlineRank = {
  airline: string;
  confirmed: number;
  partial: number;
  total: number;
};

export function rankAirlines(): AirlineRank[] {
  const map = new Map<string, AirlineRank>();

  for (const segment of flightSegments) {
    const entry = map.get(segment.airline) ?? {
      airline: segment.airline,
      confirmed: 0,
      partial: 0,
      total: 0
    };
    entry.total += 1;
    if (segment.confidence === 'confirmed') entry.confirmed += 1;
    if (segment.confidence === 'partial') entry.partial += 1;
    map.set(segment.airline, entry);
  }

  return [...map.values()].sort((a, b) => b.confirmed - a.confirmed || b.total - a.total);
}

export type RouteEdge = {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  count: number;
};

export type NetworkNode = {
  code: string;
  city: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
  count: number;
  hub: boolean;
};

const hubCodes = new Set(['LIS', 'WAW', 'MSQ', 'BOS', 'CDG', 'AMS', 'TBS']);

export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1200;

/** Approximate airport coordinates for equirectangular projection. */
const airportCoords: Record<string, { lat: number; lon: number }> = {
  SYR: { lat: 43.11, lon: -76.11 },
  EWR: { lat: 40.69, lon: -74.18 },
  JFK: { lat: 40.64, lon: -73.78 },
  BOS: { lat: 42.36, lon: -71.01 },
  HNL: { lat: 21.32, lon: -157.92 },
  KOA: { lat: 19.74, lon: -156.05 },
  SFO: { lat: 37.62, lon: -122.38 },
  KBP: { lat: 50.34, lon: 30.89 },
  KUT: { lat: 42.18, lon: 42.48 },
  MSQ: { lat: 53.88, lon: 28.03 },
  LED: { lat: 59.8, lon: 30.26 },
  LWO: { lat: 49.81, lon: 23.96 },
  ARN: { lat: 59.65, lon: 17.92 },
  ZRH: { lat: 47.46, lon: 8.55 },
  MUC: { lat: 48.35, lon: 11.79 },
  PRG: { lat: 50.1, lon: 14.26 },
  FRA: { lat: 50.03, lon: 8.57 },
  BER: { lat: 52.37, lon: 13.52 },
  CDG: { lat: 49.01, lon: 2.55 },
  AMS: { lat: 52.31, lon: 4.77 },
  WAW: { lat: 52.17, lon: 20.97 },
  SZZ: { lat: 53.58, lon: 14.9 },
  LIS: { lat: 38.77, lon: -9.13 },
  MAD: { lat: 40.47, lon: -3.57 },
  OPO: { lat: 41.24, lon: -8.68 },
  BIO: { lat: 43.3, lon: -2.91 },
  BCN: { lat: 41.3, lon: 2.08 },
  FCO: { lat: 41.8, lon: 12.25 },
  AHO: { lat: 40.63, lon: 8.29 },
  VCE: { lat: 45.51, lon: 12.35 },
  FNC: { lat: 32.69, lon: -16.77 },
  ATH: { lat: 37.94, lon: 23.94 },
  CHQ: { lat: 35.53, lon: 24.15 },
  HER: { lat: 35.34, lon: 25.18 },
  MLA: { lat: 35.86, lon: 14.48 },
  IST: { lat: 41.28, lon: 28.75 },
  SAW: { lat: 40.9, lon: 29.31 },
  LGW: { lat: 51.15, lon: -0.19 },
  LHR: { lat: 51.47, lon: -0.46 },
  MAN: { lat: 53.35, lon: -2.27 },
  TBS: { lat: 41.67, lon: 44.95 },
  TIA: { lat: 41.42, lon: 19.72 },
  UGS: { lat: 41.9, lon: 44.7 },
  MSG: { lat: 43.0, lon: 42.69 },
  DME: { lat: 55.41, lon: 37.91 },
  EVN: { lat: 40.15, lon: 44.4 },
  NLU: { lat: 19.74, lon: -99.02 },
  CUN: { lat: 21.04, lon: -86.87 },
  OAX: { lat: 17.0, lon: -96.73 },
  GDL: { lat: 20.52, lon: -103.31 },
  SGN: { lat: 10.82, lon: 106.65 },
  DAD: { lat: 16.04, lon: 108.2 },
  CMN: { lat: 33.37, lon: -7.59 },
  RAK: { lat: 31.61, lon: -8.04 },
  LPA: { lat: 27.94, lon: -15.39 },
  MEX: { lat: 19.44, lon: -99.07 },
  MIA: { lat: 25.79, lon: -80.29 },
  DOH: { lat: 25.27, lon: 51.61 },
  SVQ: { lat: 37.42, lon: -5.9 },
  WMI: { lat: 52.45, lon: 20.65 },
  CRL: { lat: 50.46, lon: 4.45 },
  BGY: { lat: 45.67, lon: 9.7 },
  CAG: { lat: 39.25, lon: 9.06 },
  KRK: { lat: 50.08, lon: 19.8 },
  LCA: { lat: 34.88, lon: 33.63 },
  IEV: { lat: 50.4, lon: 30.45 },
  VNO: { lat: 54.63, lon: 25.29 },
  BRU: { lat: 50.9, lon: 4.48 },
  TLV: { lat: 32.01, lon: 34.89 },
  DCA: { lat: 38.85, lon: -77.04 },
  EAS: { lat: 43.36, lon: -1.79 },
  CPH: { lat: 55.62, lon: 12.66 },
  EDI: { lat: 55.95, lon: -3.37 },
  MXP: { lat: 45.63, lon: 8.72 },
  PDX: { lat: 45.59, lon: -122.6 },
  PHL: { lat: 39.87, lon: -75.24 },
  TFS: { lat: 28.04, lon: -16.57 }
};

export function projectCoords(
  lat: number,
  lon: number,
  width = MAP_WIDTH,
  height = MAP_HEIGHT
): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height
  };
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function greatCircleLine(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  steps = 24
): [number, number][] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const lambda1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const lambda2 = toRad(lon2);

  const sinD = Math.sqrt(
    Math.sin((phi2 - phi1) / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin((lambda2 - lambda1) / 2) ** 2
  );
  const d = 2 * Math.asin(Math.min(1, sinD));

  if (d === 0) return [[lon1, lat1], [lon2, lat2]];

  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x =
      a * Math.cos(phi1) * Math.cos(lambda1) + b * Math.cos(phi2) * Math.cos(lambda2);
    const y =
      a * Math.cos(phi1) * Math.sin(lambda1) + b * Math.cos(phi2) * Math.sin(lambda2);
    const z = a * Math.sin(phi1) + b * Math.sin(phi2);
    const phi = Math.atan2(z, Math.hypot(x, y));
    const lambda = Math.atan2(y, x);
    coords.push([round(toDeg(lambda)), round(toDeg(phi))]);
  }

  return coords;
}

export function buildRoutesGeoJSON(edges: RouteEdge[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  for (const edge of edges) {
    const from = airportCoords[edge.from];
    const to = airportCoords[edge.to];
    if (!from || !to) continue;

    features.push({
      type: 'Feature',
      properties: {
        from: edge.from,
        to: edge.to,
        count: edge.count
      },
      geometry: {
        type: 'LineString',
        coordinates: greatCircleLine(from.lon, from.lat, to.lon, to.lat)
      }
    });
  }

  return { type: 'FeatureCollection', features };
}

export function buildAirportsGeoJSON(nodes: NetworkNode[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: nodes.map((node) => ({
      type: 'Feature',
      properties: {
        code: node.code,
        city: node.city,
        count: node.count,
        hub: node.hub
      },
      geometry: {
        type: 'Point',
        coordinates: [node.lon, node.lat]
      }
    }))
  };
}

export function buildRouteNetwork(): { nodes: NetworkNode[]; edges: RouteEdge[] } {
  const edgeMap = new Map<string, RouteEdge>();
  const visitCounts = new Map<string, { city: string; count: number }>();

  for (const segment of confirmedSegments) {
    const from = segment.originCode;
    const to = segment.destinationCode;
    if (!from || !to) continue;

    const key = `${from}|${to}`;
    const edge = edgeMap.get(key) ?? {
      from,
      to,
      fromCity: segment.originCity,
      toCity: segment.destinationCity,
      count: 0
    };
    edge.count += 1;
    edgeMap.set(key, edge);

    for (const [code, city] of [
      [from, segment.originCity],
      [to, segment.destinationCity]
    ] as const) {
      const node = visitCounts.get(code) ?? { city, count: 0 };
      node.count += 1;
      visitCounts.set(code, node);
    }
  }

  const nodes: NetworkNode[] = [...visitCounts.entries()]
    .filter(([code]) => airportCoords[code])
    .map(([code, meta]) => {
      const { lat, lon } = airportCoords[code];
      const { x, y } = projectCoords(lat, lon);
      return {
        code,
        city: meta.city,
        lat,
        lon,
        x,
        y,
        count: meta.count,
        hub: hubCodes.has(code)
      };
    })
    .sort((a, b) => b.count - a.count);

  const edges = [...edgeMap.values()].sort((a, b) => b.count - a.count);

  return { nodes, edges };
}

export function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function confidenceLabel(confidence: FlightConfidence): string {
  if (confidence === 'confirmed') return 'Confirmed';
  if (confidence === 'partial') return 'Partial';
  return 'Unresolved';
}

export function routeLabel(segment: FlightSegment): string {
  const origin = segment.originCode ?? segment.originCity;
  const destination = segment.destinationCode ?? segment.destinationCity;
  return `${origin} → ${destination}`;
}

function departureTimeSortKey(time?: string): number | null {
  if (!time) return null;
  const trimmed = time.trim();
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

export function sortedSegmentsNewestFirst(segments: FlightSegment[]): FlightSegment[] {
  return [...segments].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;

    const aTime = departureTimeSortKey(a.departureTime);
    const bTime = departureTimeSortKey(b.departureTime);
    if (aTime != null && bTime != null && aTime !== bTime) return aTime - bTime;
    if (aTime != null && bTime == null) return -1;
    if (aTime == null && bTime != null) return 1;

    return a.id.localeCompare(b.id);
  });
}
