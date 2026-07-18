# Yahor Darashkevich - Portfolio Website

Astro + Tailwind portfolio for **darashkevich.com** (Netlify: `stalwart-profiterole-ca3dd0`; DNS on Cloudflare).

## Features

- Responsive CX/support-ops portfolio with Calendly, email, phone, LinkedIn, and Upwork CTAs (no on-site contact form)
- SEO: meta tags, Open Graph PNG, inline JSON-LD (`public/schema.json`), sitemap index (`sitemap-index.xml`) with `lastmod`, IndexNow
- Accessibility: skip link, semantic landmarks, axe-core homepage audit in CI (`npm run a11y`)
- Optional Cloudflare Web Analytics (cookie-less) via `PUBLIC_CF_WEB_ANALYTICS_TOKEN`
- Private `/flights/` area gated by Netlify edge function when `FLIGHTS_PAGE_PASSWORD` is set

## Tech stack

- [Astro](https://astro.build/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- Netlify (hosting + edge functions)
- Cloudflare (DNS + optional Web Analytics)

## Getting started

Prerequisites: Node.js 20+, npm.

```bash
npm install
npm run dev          # http://localhost:4321
npm run check
npm run build
npm run preview
npm run a11y         # build + axe WCAG 2.0 A/AA on /
```

## Project structure

```
astro-portfolio/
├── public/                 # Static assets (og-image.png, schema.json, robots.txt, …)
├── src/
│   ├── components/
│   ├── layouts/Layout.astro
│   └── pages/
├── scripts/                # Deploy, OG, DMARC, a11y, IndexNow, …
├── docs/                   # Search verification, HSTS preload, uptime
├── netlify.toml
└── package.json
```

## Contact (no on-site form)

Inquiries use mailto / phone / Calendly / LinkedIn / Upwork — see `src/components/Contact.astro`. Privacy copy matches that model in `src/pages/privacy-policy.astro`.

## Optional env vars

See `.env.example`. Important ones:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console meta tag |
| `PUBLIC_BING_SITE_VERIFICATION` | Bing meta + `/BingSiteAuth.xml` at build |
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Cloudflare Web Analytics beacon |
| `PUBLIC_MAP_TILES_KEY` | Map tiles for `/flights` |
| `FLIGHTS_PAGE_PASSWORD` | Basic-auth password for `/flights` |

Search verification setup: [`docs/search-engine-verification.md`](docs/search-engine-verification.md).  
DNS / TLS hardening checklist: [`docs/dns-security.md`](docs/dns-security.md).  
DMARC / DNSSEC / CAA scripts: [`scripts/setup-dmarc.md`](scripts/setup-dmarc.md), [`scripts/setup-dnssec.md`](scripts/setup-dnssec.md), [`scripts/setup-caa.md`](scripts/setup-caa.md).  
HSTS preload: [`docs/hsts-preload.md`](docs/hsts-preload.md).  
Uptime: [`docs/uptime-monitoring.md`](docs/uptime-monitoring.md).

## Deployment

Production deploys to Netlify. See [`DEPLOYMENT.md`](DEPLOYMENT.md).

```bash
./scripts/deploy-production.sh
```

Requires `npx netlify-cli login` and a linked site.

## SEO / ops notes

- IndexNow key file is already at the site root
- Monthly freshness + PSI reminder: `.github/workflows/content-freshness-reminder.yml`
- Homepage uptime curl: `.github/workflows/uptime-check.yml`

## License

MIT — see `LICENSE`.

## Support

- Email: yahor@darashkevich.com
- LinkedIn: [Yahor Darashkevich](https://www.linkedin.com/in/darashkevich)
