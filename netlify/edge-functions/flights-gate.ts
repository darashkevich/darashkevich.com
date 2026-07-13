import type { Context } from 'https://edge.netlify.com';

const REALM = 'Flights (private)';

function unauthorized(): Response {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store'
    }
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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

export default async function flightsGate(
  request: Request,
  context: Context
): Promise<Response> {
  const expected = Deno.env.get('FLIGHTS_PAGE_PASSWORD');
  if (!expected) {
    return new Response('Flights page is locked. Set FLIGHTS_PAGE_PASSWORD in Netlify.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const provided = parsePassword(request.headers.get('Authorization'));
  if (provided && safeEqual(provided, expected)) {
    return context.next();
  }

  return unauthorized();
}
