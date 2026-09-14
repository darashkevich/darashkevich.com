#!/usr/bin/env bash
# Deploy RunSpecimen marketing site to Cloudflare Workers + custom domain.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

CLI=(npx --yes wrangler@4.112.0)

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "Dry-run: validating assets upload plan..."
  "${CLI[@]}" deploy --dry-run
  echo "Dry-run complete (no live deploy)."
  exit 0
fi

echo "Deploying RunSpecimen marketing site..."
"${CLI[@]}" deploy

echo "Done."
echo "Verify: https://runspecimen.darashkevich.com/"
