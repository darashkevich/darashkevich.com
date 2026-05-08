#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://darashkevich.com}"
INDEXNOW_KEY="${INDEXNOW_KEY:-74f2c7e9b54140a790f7dc6ab2f9d3e1}"
INDEXNOW_KEY_LOCATION="${INDEXNOW_KEY_LOCATION:-${SITE_URL}/${INDEXNOW_KEY}.txt}"
MAX_RETRIES="${MAX_RETRIES:-10}"
RETRY_DELAY_SECONDS="${RETRY_DELAY_SECONDS:-30}"

urls=(
  "${SITE_URL}/"
  "${SITE_URL}/resume/"
  "${SITE_URL}/privacy-policy/"
  "${SITE_URL}/terms-of-service/"
  "${SITE_URL}/accessibility/"
)

url_list_json=""
for url in "${urls[@]}"; do
  if [[ -n "${url_list_json}" ]]; then
    url_list_json+=", "
  fi
  url_list_json+="\"${url}\""
done

payload=$(cat <<EOF
{
  "host": "darashkevich.com",
  "key": "${INDEXNOW_KEY}",
  "keyLocation": "${INDEXNOW_KEY_LOCATION}",
  "urlList": [${url_list_json}]
}
EOF
)

echo "Submitting ${#urls[@]} URLs to IndexNow for ${SITE_URL}"

attempt=1
while (( attempt <= MAX_RETRIES )); do
  echo "IndexNow attempt ${attempt}/${MAX_RETRIES}"
  response_code="$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "${payload}" \
    "https://api.indexnow.org/indexnow")"

  if [[ "${response_code}" == "200" || "${response_code}" == "202" ]]; then
    echo "IndexNow accepted submission with HTTP ${response_code}."
    exit 0
  fi

  echo "IndexNow submission returned HTTP ${response_code}."
  if (( attempt == MAX_RETRIES )); then
    echo "IndexNow submission failed after ${MAX_RETRIES} attempts."
    exit 1
  fi

  sleep "${RETRY_DELAY_SECONDS}"
  attempt=$((attempt + 1))
done
