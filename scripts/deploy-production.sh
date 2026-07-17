#!/usr/bin/env bash
# Build and deploy darashkevich.com to Netlify production.
#
# Prerequisites:
#   npx netlify-cli login
#   npx netlify-cli link    # select the darashkevich.com site
#
# Usage:
#   ./scripts/deploy-production.sh

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

CLI=(npx --yes netlify-cli@latest)

echo "Building site..."
npm run build

echo "Running smoke test against dist..."
npm run smoke

echo "Deploying to Netlify production..."
"${CLI[@]}" deploy --prod --dir=dist --message "Production deploy $(date -u +%Y-%m-%dT%H:%MZ)"

echo "Done. Verify https://darashkevich.com/flights/"
