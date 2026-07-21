# AGENTS.md — darashkevich.com (astro-portfolio)

Astro + Tailwind portfolio for **darashkevich.com**. DNS/analytics on Cloudflare; hosting migrating from Netlify → Cloudflare Workers Static Assets (see `docs/cloudflare-migration.md`).

## Commands

```bash
npm run dev:preview   # local UI work — http://127.0.0.1:4321
npm run check         # astro sync + tsc
npm run build
npm run preview:local # production-like local preview
npm run a11y          # axe audit on /
npm run verify        # check + build + smoke
```

Prefer `dev:preview` / `preview:local` over ad-hoc ports when verifying UI.

## Layout & design

- Brand-first landing: one composition, full-bleed hero, no card clutter in the hero.
- Follow existing visual language in `src/components/` and `src/styles/` — do not invent a new purple/cream AI-default look.
- Contact is mailto / phone / Calendly / LinkedIn / Upwork only (no on-site form). See `src/components/Contact.astro`.

## Structure

- Pages: `src/pages/`
- Components / layouts: `src/components/`, `src/layouts/`
- Static assets: `public/`
- Ops scripts: `scripts/`
- Deploy notes: `DEPLOYMENT.md`, `docs/`

## Do not

- Commit secrets (`.env`, tokens). Use `.env.example` as the template.
- Change Netlify / Cloudflare production DNS or TLS without an explicit ask (Workers preview deploys are OK).
- Add an on-site contact form.

## Verify before finishing UI work

1. Run or reuse the preview on `:4321`.
2. Use the Agent browser to check layout on desktop + mobile widths when visuals changed.
3. `npm run check` (and `npm run a11y` for homepage / landmark changes).
