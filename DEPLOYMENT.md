# Deployment — darashkevich.com

**Live (today):** https://darashkevich.com on **Netlify** (`stalwart-profiterole-ca3dd0`)  
**DNS:** Cloudflare (proxied)  
**Target host:** Cloudflare Workers Static Assets — see [`docs/cloudflare-migration.md`](docs/cloudflare-migration.md)

## Recommended: Cloudflare deploy (no DNS change yet)

```bash
npx wrangler login
npx wrangler secret put FLIGHTS_PAGE_PASSWORD   # required — fail-closed
./scripts/deploy-cloudflare.sh
```

That runs `npm run build`, smoke tests (including flights gate helpers), and `wrangler deploy`.

Point `darashkevich.com` at the Worker only after the cutover checklist in [`docs/cloudflare-migration.md`](docs/cloudflare-migration.md).

## Legacy: Netlify CLI production deploy

Keep available for rollback while Netlify remains the DNS target:

```bash
npx netlify-cli login   # once
npx netlify-cli link    # once — select stalwart-profiterole-ca3dd0
./scripts/deploy-production.sh
```

**Always run `npm run build && npm run smoke` before any prod push.** The smoke
test (`scripts/smoke-test.mjs`) checks the production bundle in `dist/`: no inline
module scripts (the CSP has `script-src 'self'` without `'unsafe-inline'`, so
inline scripts are silently blocked in prod even though they work in `astro dev`),
critical interactive markup present, and click behavior for the Selected Impact
tiles and CX Operating System stages (verified in jsdom).

## Build settings

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish / assets directory | `dist` |
| Node | `22` |
| Cloudflare config | `wrangler.jsonc` |
| Netlify config (legacy) | `netlify.toml` |

## Environment variables

**Cloudflare**

- `FLIGHTS_PAGE_PASSWORD` — Worker secret (`wrangler secret put`); missing → `/flights` stays **401**
- `PUBLIC_MAP_TILES_KEY` / `PUBLIC_MAP_TILES_PROVIDER` — build-time map tiles
- `PUBLIC_CF_WEB_ANALYTICS_TOKEN` — optional analytics beacon
- `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` — search verification ([docs](docs/search-engine-verification.md))

**Netlify (legacy parallel)** — same `PUBLIC_*` names in Site configuration; edge gate uses `FLIGHTS_PAGE_PASSWORD` (allow-through if unset — do not rely on that after cutover).

## Headers / security

- Cloudflare: `public/_headers` (+ flights CSP/`no-store` applied in `workers/flights-gate.ts` for gated responses)
- Netlify: `netlify.toml` `[[headers]]` while that host remains live
- HSTS preload list: [`docs/hsts-preload.md`](docs/hsts-preload.md)

## DNS / email hardening

Full checklist: [`docs/dns-security.md`](docs/dns-security.md).

- Email MX/SPF/DKIM/DMARC must stay intact across hosting cutover
- Before switching origin to Cloudflare, confirm TLS/CAA ([migration doc](docs/cloudflare-migration.md))

## Post-deploy checks

```bash
npm run audit:prod
curl -sI https://darashkevich.com/ | head
curl -sI https://darashkevich.com/flights/ | head   # expect 401 when gated
```
