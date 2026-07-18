# Deployment — darashkevich.com

**Live:** https://darashkevich.com  
**Netlify site:** `stalwart-profiterole-ca3dd0`  
**DNS:** Cloudflare (proxied to Netlify)

## Recommended: CLI production deploy

```bash
npx netlify-cli login   # once
npx netlify-cli link    # once — select stalwart-profiterole-ca3dd0
./scripts/deploy-production.sh
```

That script runs `npm run build`, `npm run smoke`, and `netlify deploy --prod --dir=dist`.

**Always run `npm run build && npm run smoke` before any prod push.** The smoke
test (`scripts/smoke-test.mjs`) checks the production bundle in `dist/`: no inline
module scripts (the CSP has `script-src 'self'` without `'unsafe-inline'`, so
inline scripts are silently blocked in prod even though they work in `astro dev`),
critical interactive markup present, and click behavior for the Selected Impact
tiles and CX Operating System stages (verified in jsdom).

Git pushes to `main` can also trigger Netlify’s linked repo build if continuous deployment is enabled.

## Build settings (Netlify)

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node | `20` (set in `netlify.toml`) |

## Environment variables

Set in Netlify → Site configuration → Environment variables (and optionally local `.env`):

- `FLIGHTS_PAGE_PASSWORD` — private `/flights` gate
- `PUBLIC_MAP_TILES_KEY` / `PUBLIC_MAP_TILES_PROVIDER` — map tiles
- `PUBLIC_CF_WEB_ANALYTICS_TOKEN` — optional analytics beacon
- `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` — search verification ([docs](docs/search-engine-verification.md))

Set secrets via Netlify UI or `npx netlify-cli env:set … --secret` (do not commit helper scripts that pass passwords/keys on the CLI).

## Headers / security

`netlify.toml` sets HSTS (including `preload`), CSP, and related security headers.  
Submitting to the Chromium HSTS preload list is a separate manual step: [`docs/hsts-preload.md`](docs/hsts-preload.md).

## DNS / email hardening

- Apex/`www` should point at Netlify (Cloudflare orange-cloud is fine)
- DMARC starter record: [`scripts/setup-dmarc.md`](scripts/setup-dmarc.md) (`./scripts/setup-dmarc.sh` if `CLOUDFLARE_API_TOKEN` is available)

## Post-deploy checks

```bash
npm run audit:prod
curl -sI https://darashkevich.com/ | head
```

Optional: PageSpeed Insights and Search Console/Bing verification after env vars are set.
