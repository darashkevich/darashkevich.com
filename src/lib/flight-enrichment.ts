import { flightEnrichment, type FlightEnrichment } from '../data/flight-enrichment';
import { flightSegments, type FlightSegment } from '../data/flights';

export function getFlightEnrichment(segment: FlightSegment): FlightEnrichment | null {
  return flightEnrichment[segment.id] ?? null;
}

export function countEnrichedSegments(): number {
  return Object.keys(flightEnrichment).length;
}

export function countEligibleFr24SummarySegments(): number {
  return flightSegments.filter((segment) => isEligibleForFr24Summary(segment)).length;
}

export function isEligibleForFr24Summary(segment: FlightSegment): boolean {
  return Boolean(
    segment.confidence === 'confirmed' &&
      segment.flightNumber &&
      segment.originCode &&
      segment.destinationCode &&
      segment.date >= '2022-06-01'
  );
}

export function formatFlightDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatDistanceKm(km?: number): string | null {
  if (!km || km <= 0) return null;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

export function enrichmentDetail(enrichment: FlightEnrichment): string | null {
  const parts = [
    formatFlightDuration(enrichment.flightTimeSeconds),
    formatDistanceKm(enrichment.actualDistanceKm ?? enrichment.circleDistanceKm),
    enrichment.runwayTakeoff && enrichment.runwayLanding
      ? `${enrichment.runwayTakeoff} → ${enrichment.runwayLanding}`
      : null
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : null;
}
