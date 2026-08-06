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
- Delete `public/signature/icons/*` — they are hotlinked by the macOS Mail / Gmail signature (`/signature/icons/v2/*.png`).

## Verify before finishing UI work

1. Run or reuse the preview on `:4321`.
2. Use the Agent browser to check layout on desktop + mobile widths when visuals changed.
3. `npm run check` (and `npm run a11y` for homepage / landmark changes).

## Push to prod / main

Do **not** leave `main` red — CI failure emails are noise Yahor does not want.

Before `git push` to `main` or `npm run deploy:cf`:

1. Run CI-equivalent gates locally: `npm run audit:deps`, then `npm run verify` (or at least `check` + `build` + `smoke`).
2. If dependencies or the lockfile changed, regenerate with **npm 10** (`npx npm@10 install`) so Actions `npm ci` matches.
3. After push, `gh run watch` the CI workflow until **verify succeeds**; fix and re-push in the same ship if it fails.

Prefer one green landing over a red commit + hotfix.

## Cursor Cloud specific instructions

- Static Astro site; no backend/DB. Setup is just `npm install` (Node 20+; VM has Node 22). Commands live in `package.json` / README.
- Dev server: `npm run dev:preview` binds `127.0.0.1:4321`. Start it in a long-lived tmux session (it stays running); don't background it as a one-shot.
- `npm run smoke:flights` (and therefore `npm run verify`) makes live network calls to `https://darashkevich.com`; expect those live checks to fail/skip if the VM has no outbound network. `npm run smoke` (post-build, local `dist/`) has no such dependency.
- The homepage "CX Operating System" section is driven by hover/focus (and click) on the stage nodes — verify interactivity by hovering stages and watching the caption update, not just by loading the page.
