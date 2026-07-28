/** Pure helpers for /flights Basic auth (unit-testable without Wrangler). */

export const REALM = 'Flights (private)';

export const FLIGHTS_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' https://static.cloudflareinsights.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.maptiler.com https://cdn.maptiler.com https://demotiles.maplibre.org https://tiles.stadiamaps.com; font-src 'self' data: https://api.maptiler.com https://cdn.maptiler.com https://demotiles.maplibre.org https://tiles.stadiamaps.com; connect-src 'self' https://api.maptiler.com https://cdn.maptiler.com https://demotiles.maplibre.org https://tiles.stadiamaps.com https://cloudflareinsights.com; form-action 'self'; upgrade-insecure-requests";

/** Failed-auth attempts per client (best-effort per isolate). */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_FAILURES = 20;

const authFailures = new Map<string, { count: number; resetAt: number }>();

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

/** Constant-time compare via fixed-length SHA-256 digests (avoids length oracle). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const ua = new Uint8Array(ha);
  const ub = new Uint8Array(hb);
  let mismatch = 0;
  for (let i = 0; i < ua.length; i++) {
    mismatch |= ua[i] ^ ub[i];
  }
  return mismatch === 0;
}

export async function isAuthorized(
  authHeader: string | null,
  expectedPassword: string,
): Promise<boolean> {
  if (!expectedPassword) return false;
  const provided = parsePassword(authHeader);
  return Boolean(provided && (await safeEqual(provided, expectedPassword)));
}

export function clientKeyFromRequest(request: Request): string {
  const cf = (request as Request & { cf?: { colo?: string } }).cf;
  const forwarded = request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? '';
  return forwarded || `anon:${cf?.colo ?? 'unknown'}`;
}

/** Returns true when this client should be blocked for too many failed auths. */
export function recordAuthFailureAndLimited(clientKey: string): boolean {
  const now = Date.now();
  let entry = authFailures.get(clientKey);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    authFailures.set(clientKey, entry);
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_FAILURES;
}

export function clearAuthFailures(clientKey: string): void {
  authFailures.delete(clientKey);
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

export function rateLimitedResponse(): Response {
  return new Response('Too many authentication attempts. Try again later.', {
    status: 429,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=UTF-8',
      'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
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
