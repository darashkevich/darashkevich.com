/** Pure helpers for /flights Basic auth (unit-testable without Wrangler). */

export const REALM = 'Flights (private)';

export const FLIGHTS_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' https://static.cloudflareinsights.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.maptiler.com https://cdn.maptiler.com https://demotiles.maplibre.org https://tiles.stadiamaps.com; font-src 'self' data: https://api.maptiler.com https://cdn.maptiler.com https://demotiles.maplibre.org https://tiles.stadiamaps.com; connect-src 'self' https://api.maptiler.com https://cdn.maptiler.com https://demotiles.maplibre.org https://tiles.stadiamaps.com https://cloudflareinsights.com; form-action 'self'; upgrade-insecure-requests";

export function parsePassword(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(authHeader.slice(6));
    const colon = decoded.indexOf(':');
    return colon >= 0 ? decoded.slice(colon + 1) : null;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

export function isAuthorized(
  authHeader: string | null,
  expectedPassword: string,
): boolean {
  if (!expectedPassword) return false;
  const provided = parsePassword(authHeader);
  return Boolean(provided && safeEqual(provided, expectedPassword));
}

export function unauthorizedResponse(body = 'Authentication required.'): Response {
  return new Response(body, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=UTF-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

/** Attach flights CSP + no-store to an ASSETS response (Worker-returned responses skip `_headers`). */
export function applyFlightsResponseHeaders(
  assetResponse: Response,
  csp: string,
): Response {
  const headers = new Headers(assetResponse.headers);
  headers.set('Content-Security-Policy', csp);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  );
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload',
  );

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

export function isFlightsPath(pathname: string): boolean {
  return (
    pathname === '/flights' ||
    pathname === '/flights/' ||
    pathname.startsWith('/flights/')
  );
}
