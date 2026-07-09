export type FlightEnrichmentProvider = 'fr24';

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
 * Keep this separate from `flights.ts`: the hand-curated archive remains the
 * source of truth, while provider-derived facts can be refreshed or removed.
 */
export const flightEnrichment: Record<string, FlightEnrichment> = {};
