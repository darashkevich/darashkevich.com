import type { Context } from 'https://edge.netlify.com';

const REALM = 'Flights (private)';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_FAILURES = 20;
const authFailures = new Map<string, { count: number; resetAt: number }>();

const securityHeaders: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Content-Type': 'text/plain; charset=UTF-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function unauthorized(body = 'Authentication required.'): Response {
  return new Response(body, {
    status: 401,
    headers: {
      ...securityHeaders,
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

function rateLimited(): Response {
  return new Response('Too many authentication attempts. Try again later.', {
    status: 429,
    headers: {
      ...securityHeaders,
      'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
    },
  });
}

function parsePassword(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(authHeader.slice(6));
    const colon = decoded.indexOf(':');
    return colon >= 0 ? decoded.slice(colon + 1) : null;
  } catch {
    return null;
  }
}

async function safeEqual(a: string, b: string): Promise<boolean> {
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

function clientKey(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? request.headers.get('X-NF-Client-Connection-IP')
    ?? 'anon'
  );
}

function recordFailureAndLimited(key: string): boolean {
  const now = Date.now();
  let entry = authFailures.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    authFailures.set(key, entry);
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_FAILURES;
}

export default async function flightsGate(
  request: Request,
  context: Context,
): Promise<Response> {
  // Fail closed when the secret is missing — matches workers/flights-gate.ts.
  // Netlify remains a rollback / .netlify.app host; never serve /flights openly.
  const expected = Deno.env.get('FLIGHTS_PAGE_PASSWORD');
  if (!expected) {
    return unauthorized('Flights gate is misconfigured (secret missing).');
  }

  const key = clientKey(request);
  const provided = parsePassword(request.headers.get('Authorization'));
  if (provided && (await safeEqual(provided, expected))) {
    authFailures.delete(key);
    return context.next();
  }

  if (recordFailureAndLimited(key)) {
    return rateLimited();
  }

  return unauthorized();
}
