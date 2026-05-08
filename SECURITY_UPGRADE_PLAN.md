# Security Upgrade Plan

This plan focuses on reducing known vulnerabilities while preserving site stability.

## Current Baseline

- `npm audit` reports moderate/high vulnerabilities, mostly transitive.
- The highest-risk path is through build tooling and framework internals.

## Phase 1: Safe Patch Upgrades (Low Risk)

1. Update within current major versions:

```bash
npm update
```

2. Apply non-breaking audit fixes:

```bash
npm audit fix
```

3. Validate:

```bash
npm run check
npm run build
```

## Phase 2: Framework Major Upgrade (Medium/High Risk)

Move from Astro 5 to latest Astro 6 line to pick up security fixes.

1. Create a dedicated upgrade branch.
2. Upgrade framework and official integrations together:

```bash
npm install astro@latest @astrojs/tailwind@latest @astrojs/sitemap@latest @astrojs/check@latest
```

3. Validate:

```bash
npm run check
npm run build
npm run preview
```

4. Manual smoke test:
- homepage
- nav and mobile menu
- legal pages
- resume download links

## Phase 3: Dependency Hygiene (Ongoing)

- Run monthly:

```bash
npm outdated
npm audit
```

- Keep lockfile updates small and frequent.
- Gate deploys on successful `npm run verify`.

## Rollback Guidance

- Keep a known-good lockfile committed.
- If upgrade introduces regressions:
  - revert lockfile + package changes
  - redeploy previous build
  - retry in smaller increments
