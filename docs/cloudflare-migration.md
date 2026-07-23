# Cloudflare Workers migration — darashkevich.com

Controlled cutover from Netlify → **Cloudflare Workers Static Assets** + fail-closed Basic-auth gate for `/flights`.

**Status:** apex traffic is on Cloudflare Workers (proxied). Netlify remains published as a rollback / `.netlify.app` duplicate until unpublished.

## Architecture

```text
Git → npm run build → dist/
                    → wrangler deploy
                         → public pages from ASSETS
                         → /flights + /flights/ + /flights/* :
                              Worker first (run_worker_first)
                              → Basic auth (fail closed)
                              → ASSETS + flights CSP / no-store
```

## One-time setup

1. `npx wrangler login`
2. Put the flights password (never `PUBLIC_*`):

   ```bash
   npx wrangler secret put FLIGHTS_PAGE_PASSWORD
   ```

3. Set build-time env vars in Cloudflare Workers Builds / CI (or your shell before deploy):

   - `PUBLIC_MAP_TILES_PROVIDER=maptiler`
   - `PUBLIC_MAP_TILES_KEY` (optional)
   - `PUBLIC_CF_WEB_ANALYTICS_TOKEN` (optional)
   - search verification vars if used

4. Local Wrangler: copy `.dev.vars.example` → `.dev.vars`

## Deploy (does not change DNS)

```bash
./scripts/deploy-cloudflare.sh
# or
./scripts/deploy-cloudflare.sh --dry-run
```

After deploy, run live gate checks:

```bash
export FLIGHTS_SMOKE_BASE_URL='https://<worker>.<subdomain>.workers.dev'
export FLIGHTS_PAGE_PASSWORD='…'
npm run smoke:flights
```

Confirm on **every** hostname that will exist (workers.dev, preview URLs, custom domain):

- `GET /` → 200
- `GET /flights` and `/flights/` without auth → **401**
- `GET /flights/` with Basic auth → 200
- No private itinerary HTML when unauthenticated

## Headers / redirects

| Source | Cloudflare |
| --- | --- |
| `netlify.toml` `[[headers]]` | `public/_headers` (copied into `dist/`) |
| `/flights` CSP on gated responses | also set in `workers/flights-gate.ts` (Worker responses skip `_headers`) |
| `public/_redirects` | Workers Static Assets redirects |

## Cutover checklist

1. Cloudflare deploy green; smoke + live gate checks pass on workers.dev.
2. Attach `darashkevich.com` + `www` as custom domains on the Worker.
3. **CAA / TLS:** inspect effective CAA; confirm Cloudflare Universal SSL is **Active** before traffic switch ([CAA guidance](https://developers.cloudflare.com/ssl/edge-certificates/caa-records/)). Do not blindly keep Netlify-only `accounturi` if it blocks CF issuance.
4. Keep email DNS (MX / SPF / DKIM / DMARC) unchanged.
5. Point DNS / orange-cloud origin from Netlify → this Worker (or CNAME to workers.dev target Cloudflare shows).
6. Re-run live smoke against `https://darashkevich.com` (home + unauthenticated `/flights/` → 401).
7. Leave Netlify production deploy **untouched** for 1–2 days as rollback.
8. Disable Netlify auto-publish; later remove Netlify-only config when confident.

## Rollback

Route the domain back to Netlify while that deploy still exists. No need to delete the Worker.

## Retire Netlify (later)

- Turn off production auto-deploys
- Confirm `.netlify.app` returns `X-Robots-Tag: noindex` (or is unpublished)
- Prefer a Cloudflare Redirect Rule: `www` → apex (301/308)
- Remove `netlify/` edge function usage from docs once CF is sole host
- Update CAA if still Netlify-scoped
- Cancel paid Netlify only after nothing else uses the account

## Fail-closed note

Both the Worker and the Netlify edge gate **deny** `/flights` when `FLIGHTS_PAGE_PASSWORD` is missing. That prevents accidental public exposure on the rollback host.
