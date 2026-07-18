#!/usr/bin/env bash
# Enable DNSSEC for darashkevich.com via Cloudflare API.
#
# Required env:
#   CLOUDFLARE_API_TOKEN  — zone DNS / DNSSEC edit on darashkevich.com
# Optional:
#   CLOUDFLARE_ZONE_ID    — zone id (auto-looked-up if omitted)
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   ./scripts/setup-dnssec.sh
#
# If credentials are unavailable, follow scripts/setup-dnssec.md

set -euo pipefail

ZONE_NAME="darashkevich.com"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is not set."
  echo "See scripts/setup-dnssec.md for manual Cloudflare steps."
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

current="$(
  curl -fsS "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dnssec"
)"

status="$(
  python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("result") or {}).get("status") or "")' <<<"${current}"
)"

echo "Current DNSSEC status: ${status:-unknown}"

if [[ "${status}" == "active" || "${status}" == "pending" ]]; then
  echo "DNSSEC already ${status}. Nothing to change."
  echo "Verify with: dig +short DS ${ZONE_NAME}"
  exit 0
fi

echo "Enabling DNSSEC..."
curl -fsS -X PATCH "${auth[@]}" \
  --data '{"status":"active"}' \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dnssec" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("New status:", (d.get("result") or {}).get("status")); raise SystemExit(0 if d.get("success") else 1)'

echo "Done. Verify with: dig +short DS ${ZONE_NAME}"
