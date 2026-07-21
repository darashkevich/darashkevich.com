#!/usr/bin/env bash
# Build and deploy darashkevich.com to Cloudflare Workers (static assets + flights gate).
#
# Prerequisites:
#   npx wrangler login
#   npx wrangler secret put FLIGHTS_PAGE_PASSWORD   # required (fail-closed)
#   Optional build env: PUBLIC_MAP_TILES_KEY, PUBLIC_CF_WEB_ANALYTICS_TOKEN, …
#
# Usage:
#   ./scripts/deploy-cloudflare.sh           # workers.dev / configured routes
#   ./scripts/deploy-cloudflare.sh --dry-run
#
# DNS cutover to the custom domain is a separate manual step — see docs/cloudflare-migration.md

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

CLI=(npx --yes wrangler@latest)

echo "Building site..."
npm run build

echo "Running smoke tests..."
npm run smoke
npm run smoke:flights

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "Dry-run: validating Worker bundle + assets upload plan..."
  "${CLI[@]}" deploy --dry-run
  echo "Dry-run complete (no live deploy)."
  exit 0
fi

echo "Deploying to Cloudflare Workers..."
"${CLI[@]}" deploy

echo "Done."
echo "Verify:"
echo "  - Homepage on the workers.dev / custom URL"
echo "  - Unauthenticated GET /flights/ → 401"
echo "  - Authenticated GET /flights/ → 200"
echo "See docs/cloudflare-migration.md before pointing darashkevich.com DNS here."
