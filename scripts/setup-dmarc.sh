#!/usr/bin/env bash
# Create or update _dmarc TXT for darashkevich.com via Cloudflare API.
#
# Required env:
#   CLOUDFLARE_API_TOKEN  — Zone:DNS:Edit on the darashkevich.com zone
# Optional:
#   CLOUDFLARE_ZONE_ID    — zone id (auto-looked-up if omitted)
#   DMARC_RUA             — default mailto:yahor@darashkevich.com
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   ./scripts/setup-dmarc.sh
#
# If credentials are unavailable, follow scripts/setup-dmarc.md

set -euo pipefail

DMARC_RUA="${DMARC_RUA:-mailto:yahor@darashkevich.com}"
DMARC_VALUE="v=DMARC1; p=none; rua=${DMARC_RUA}; fo=1"
RECORD_NAME="_dmarc"
ZONE_NAME="darashkevich.com"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is not set."
  echo "See scripts/setup-dmarc.md for manual Cloudflare steps."
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
echo "DMARC: ${DMARC_VALUE}"

existing="$(
  curl -fsS "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=TXT&name=${RECORD_NAME}.${ZONE_NAME}"
)"

record_id="$(
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["result"][0]["id"] if d.get("success") and d.get("result") else "")' <<<"${existing}"
)"

payload="$(
  RECORD_NAME="${RECORD_NAME}" DMARC_VALUE="${DMARC_VALUE}" python3 - <<'PY'
import json, os
print(json.dumps({
  "type": "TXT",
  "name": os.environ["RECORD_NAME"],
  "content": os.environ["DMARC_VALUE"],
  "ttl": 3600,
  "comment": "DMARC starter policy (p=none) for darashkevich.com"
}))
PY
)"

if [[ -n "${record_id}" ]]; then
  echo "Updating existing TXT ${RECORD_NAME}.${ZONE_NAME} (${record_id})..."
  curl -fsS -X PUT "${auth[@]}" \
    --data "${payload}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
else
  echo "Creating TXT ${RECORD_NAME}.${ZONE_NAME}..."
  curl -fsS -X POST "${auth[@]}" \
    --data "${payload}" \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); raise SystemExit(0 if d.get("success") else 1)'
fi

echo "Done. Verify with: dig +short TXT _dmarc.darashkevich.com"
