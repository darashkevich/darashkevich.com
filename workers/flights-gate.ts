/**
 * Cloudflare Worker: fail-closed Basic auth for /flights.
 * Public pages are served by static assets without invoking this script
 * (see wrangler.jsonc assets.run_worker_first).
 */
import {
  FLIGHTS_CSP,
  applyFlightsResponseHeaders,
  isAuthorized,
  unauthorizedResponse,
} from './flights-auth';

export interface Env {
  ASSETS: Fetcher;
  /** Required secret. Missing/empty → deny (fail closed). */
  FLIGHTS_PAGE_PASSWORD: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const expected = env.FLIGHTS_PAGE_PASSWORD;
    if (!expected) {
      return unauthorizedResponse(
        'Flights gate is misconfigured (secret missing).',
      );
    }

    if (!isAuthorized(request.headers.get('Authorization'), expected)) {
      return unauthorizedResponse();
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return applyFlightsResponseHeaders(assetResponse, FLIGHTS_CSP);
  },
};
