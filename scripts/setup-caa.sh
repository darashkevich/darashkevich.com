#!/usr/bin/env bash
# Create or replace apex CAA for darashkevich.com (Netlify Let's Encrypt account).
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
CAA_VALUE='letsencrypt.org;accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/54403714'

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
echo "CAA issue: ${CAA_VALUE}"

existing="$(
  curl -fsS "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=CAA&name=${ZONE_NAME}"
)"

# Bash 3.2-compatible (macOS /bin/bash has no mapfile).
record_ids="$(
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(r["id"] for r in (d.get("result") or [])))' <<<"${existing}"
)"

desired_payload="$(python3 - <<PY
import json
print(json.dumps({
  "type": "CAA",
  "name": "@",
  "data": {
    "flags": 0,
    "tag": "issue",
    "value": "${CAA_VALUE}"
  },
  "ttl": 3600,
  "comment": "Netlify Let's Encrypt account binding for darashkevich.com"
}))
PY
)"

matched=""
while IFS= read -r rid; do
  [[ -z "${rid}" ]] && continue
  detail="$(
    curl -fsS "${auth[@]}" \
      "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${rid}"
  )"
  same="$(
    python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result") or {}; data=r.get("data") or {};
print("1" if data.get("tag")=="issue" and data.get("value")==sys.argv[1] and int(data.get("flags",0))==0 else "0")' \
      "${CAA_VALUE}" <<<"${detail}"
  )"
  if [[ "${same}" == "1" ]]; then
    matched="${rid}"
  else
    echo "Removing non-matching CAA ${rid}..."
    curl -fsS -X DELETE "${auth[@]}" \
      "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${rid}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
  fi
done <<<"${record_ids}"

if [[ -n "${matched}" ]]; then
  echo "Desired CAA already present (${matched})."
else
  echo "Creating CAA issue record..."
  curl -fsS -X POST "${auth[@]}" \
    --data "${desired_payload}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
fi

echo "Done. Verify with: dig +short CAA ${ZONE_NAME}"
