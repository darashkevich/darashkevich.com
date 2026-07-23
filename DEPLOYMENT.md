# Deployment — darashkevich.com

**Live (today):** https://darashkevich.com on **Cloudflare Workers Static Assets** (`darashkevich-com`)  
**DNS:** Cloudflare (proxied)  
**Rollback host:** Netlify `stalwart-profiterole-ca3dd0` (`.netlify.app` only — keep fail-closed + `noindex` until unpublished)

Migration notes: [`docs/cloudflare-migration.md`](docs/cloudflare-migration.md)

## Cloudflare deploy

```bash
npx wrangler login
npx wrangler secret put FLIGHTS_PAGE_PASSWORD   # required — fail-closed
./scripts/deploy-cloudflare.sh
```

That runs `npm run build`, smoke tests (including flights gate helpers), and `wrangler deploy`.

## Legacy: Netlify CLI (rollback only)

Keep available while the Netlify site remains published for emergency rollback:

```bash
npx netlify-cli login   # once
npx netlify-cli link    # once — select stalwart-profiterole-ca3dd0
./scripts/deploy-production.sh
```

After any Netlify deploy, confirm `/flights/` still returns **401** without auth and responses include `X-Robots-Tag: noindex, nofollow`.

**Always run `npm run build && npm run smoke && npm run smoke:flights` before any prod push.** The homepage smoke test (`scripts/smoke-test.mjs`) checks the production bundle in `dist/`: no inline module scripts (CSP is `script-src 'self'` without `'unsafe-inline'`), critical interactive markup, and click behavior for Selected Impact / CX OS (jsdom, isolated module scopes). Flights smoke asserts both Worker and Netlify gates fail closed and, by default, live-checks `https://darashkevich.com/flights/` → 401.

## Build settings

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish / assets directory | `dist` |
| Node | `22` |
| Cloudflare config | `wrangler.jsonc` |
| Netlify config (rollback) | `netlify.toml` |

## Environment variables

**Cloudflare**

- `FLIGHTS_PAGE_PASSWORD` — Worker secret (`wrangler secret put`); missing → `/flights` stays **401**
- `PUBLIC_MAP_TILES_KEY` / `PUBLIC_MAP_TILES_PROVIDER` — build-time map tiles
- `PUBLIC_CF_WEB_ANALYTICS_TOKEN` — optional analytics beacon
- `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` — search verification ([docs](docs/search-engine-verification.md))

**Netlify (rollback)** — same `PUBLIC_*` names in Site configuration; edge gate uses `FLIGHTS_PAGE_PASSWORD` and **fails closed** if unset (same as Workers).

## Headers / security

- Cloudflare: `public/_headers` (+ flights CSP/`no-store` applied in `workers/flights-gate.ts` for gated responses)
- Netlify: `netlify.toml` `[[headers]]` including site-wide `X-Robots-Tag: noindex, nofollow` on the rollback host
- HSTS preload list: [`docs/hsts-preload.md`](docs/hsts-preload.md)

## DNS / email hardening

Full checklist: [`docs/dns-security.md`](docs/dns-security.md).

- Email MX/SPF/DKIM/DMARC must stay intact
- Preferred SEO posture: permanent redirect `www` → apex (Cloudflare Redirect Rule); unpublish Netlify when rollback window ends

## Post-deploy checks

```bash
npm run audit:prod
curl -sI https://darashkevich.com/ | head
curl -sI https://darashkevich.com/flights/ | head   # expect 401 when gated
```
