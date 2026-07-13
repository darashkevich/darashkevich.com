#!/usr/bin/env bash
# Configure MapTiler env vars on Netlify and trigger a production deploy.
#
# Prerequisites:
#   1. npm i -g netlify-cli   (or use npx netlify-cli)
#   2. netlify login
#   3. netlify link           (select darashkevich.com site)
#
# Usage:
#   ./scripts/set-netlify-map-env.sh YOUR_MAPTILER_KEY

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <PUBLIC_MAP_TILES_KEY>" >&2
  echo "Get a domain-restricted key at https://cloud.maptiler.com/account/keys" >&2
  exit 1
fi

KEY="$1"
CLI=(npx --yes netlify-cli@latest)

"${CLI[@]}" env:set PUBLIC_MAP_TILES_PROVIDER maptiler --context production
"${CLI[@]}" env:set PUBLIC_MAP_TILES_KEY "$KEY" --context production --secret
"${CLI[@]}" env:set PUBLIC_MAP_TILES_PROVIDER maptiler --context deploy-preview
"${CLI[@]}" env:set PUBLIC_MAP_TILES_KEY "$KEY" --context deploy-preview --secret

echo "Map tile env vars set. Triggering production deploy..."
"${CLI[@]}" deploy --build --prod

echo "Done. Verify /flights/ after the deploy completes."
