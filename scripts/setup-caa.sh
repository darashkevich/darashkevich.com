#!/usr/bin/env bash
# Create or replace apex CAA for darashkevich.com (Cloudflare Universal SSL issuers).
#
# Required env:
#   CLOUDFLARE_API_TOKEN  — Zone:DNS:Edit on the darashkevich.com zone
# Optional:
#   CLOUDFLARE_ZONE_ID    — zone id (auto-looked-up if omitted)
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   ./scripts/setup-caa.sh
#
# If credentials are unavailable, follow scripts/setup-caa.md

set -euo pipefail

ZONE_NAME="darashkevich.com"
# Cloudflare Universal SSL issues via Let's Encrypt and Google Trust Services.
# No Netlify-only accounturi — that blocked CF renewal after Workers cutover.
CAA_ISSUERS=(
  "letsencrypt.org"
  "pki.goog;cansignhttpexchanges=yes"
)

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is not set."
  echo "See scripts/setup-caa.md for manual Cloudflare steps."
  exit 1
fi

auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  echo "Looking up zone id for ${ZONE_NAME}..."
  CLOUDFLARE_ZONE_ID="$(
    curl -fsS "${auth[@]}" \
      "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["result"][0]["id"] if d.get("success") and d.get("result") else "")'
  )"
  if [[ -z "${CLOUDFLARE_ZONE_ID}" ]]; then
    echo "Could not resolve Cloudflare zone id for ${ZONE_NAME}."
    exit 1
  fi
fi

echo "Zone: ${CLOUDFLARE_ZONE_ID}"
echo "CAA issuers: ${CAA_ISSUERS[*]}"

existing="$(
  curl -fsS "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=CAA&name=${ZONE_NAME}"
)"

# Remove all existing apex CAA issue records, then recreate the desired set.
record_ids="$(
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(r["id"] for r in (d.get("result") or [])))' <<<"${existing}"
)"

while IFS= read -r rid; do
  [[ -z "${rid}" ]] && continue
  echo "Removing existing CAA ${rid}..."
  curl -fsS -X DELETE "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${rid}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
done <<<"${record_ids}"

for issuer in "${CAA_ISSUERS[@]}"; do
  desired_payload="$(
    CAA_VALUE="${issuer}" python3 - <<'PY'
import json, os
print(json.dumps({
  "type": "CAA",
  "name": "@",
  "data": {
    "flags": 0,
    "tag": "issue",
    "value": os.environ["CAA_VALUE"]
  },
  "ttl": 3600,
  "comment": "Cloudflare Universal SSL issuer for darashkevich.com"
}))
PY
  )"
  echo "Creating CAA issue: ${issuer}"
  curl -fsS -X POST "${auth[@]}" \
    --data "${desired_payload}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
done

echo "Done. Verify with: dig +short CAA ${ZONE_NAME}"
