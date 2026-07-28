/**
 * Cloudflare Worker: fail-closed Basic auth for /flights.
 * Public pages are served by static assets without invoking this script
 * (see wrangler.jsonc assets.run_worker_first). Path checks remain defense-in-depth
 * if run_worker_first is misconfigured.
 */
import {
  FLIGHTS_CSP,
  applyFlightsResponseHeaders,
  clearAuthFailures,
  clientKeyFromRequest,
  isAuthorized,
  isFlightsPath,
  rateLimitedResponse,
  recordAuthFailureAndLimited,
  unauthorizedResponse,
} from './flights-auth';

export interface Env {
  ASSETS: Fetcher;
  /** Required secret. Missing/empty → deny (fail closed). */
  FLIGHTS_PAGE_PASSWORD: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    // Defense-in-depth: if the Worker is invoked for non-flights paths, pass through.
    if (!isFlightsPath(pathname)) {
      return env.ASSETS.fetch(request);
    }

    const expected = env.FLIGHTS_PAGE_PASSWORD;
    if (!expected) {
      return unauthorizedResponse(
        'Flights gate is misconfigured (secret missing).',
      );
    }

    const clientKey = clientKeyFromRequest(request);
    if (await isAuthorized(request.headers.get('Authorization'), expected)) {
      clearAuthFailures(clientKey);
      const assetResponse = await env.ASSETS.fetch(request);
      return applyFlightsResponseHeaders(assetResponse, FLIGHTS_CSP);
    }

    if (recordAuthFailureAndLimited(clientKey)) {
      return rateLimitedResponse();
    }

    return unauthorizedResponse();
  },
};
