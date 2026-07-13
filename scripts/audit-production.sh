#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://darashkevich.com}"
MAX_RETRIES="${MAX_RETRIES:-15}"
RETRY_DELAY_SECONDS="${RETRY_DELAY_SECONDS:-20}"

required_headers=(
  "strict-transport-security"
  "content-security-policy"
  "x-content-type-options"
  "x-frame-options"
  "referrer-policy"
  "permissions-policy"
)

required_paths=(
  "/"
  "/privacy-policy/"
  "/terms-of-service/"
  "/accessibility/"
  "/flights/"
  "/.well-known/security.txt"
  "/security.txt"
  "/robots.txt"
  "/sitemap-index.xml"
)

echo "Starting production audit for ${SITE_URL}"

fetch_headers() {
  curl -sS -I "${SITE_URL}/" | tr '[:upper:]' '[:lower:]'
}

check_headers() {
  local headers="$1"
  for header in "${required_headers[@]}"; do
    if [[ "${headers}" != *$'\n'"${header}:"* && "${headers}" != "${header}:"* ]]; then
      echo "Missing required header: ${header}"
      return 1
    fi
  done
  return 0
}

attempt=1
while (( attempt <= MAX_RETRIES )); do
  echo "Header check attempt ${attempt}/${MAX_RETRIES}"
  headers="$(fetch_headers)"
  if check_headers "${headers}"; then
    echo "Required headers are present."
    break
  fi

  if (( attempt == MAX_RETRIES )); then
    echo "Failed header checks after ${MAX_RETRIES} attempts."
    exit 1
  fi

  sleep "${RETRY_DELAY_SECONDS}"
  attempt=$((attempt + 1))
done

for path in "${required_paths[@]}"; do
  status="$(curl -sS -o /dev/null -w "%{http_code}" "${SITE_URL}${path}")"
  echo "${status} ${path}"
  if [[ "${status}" != "200" ]]; then
    echo "Unexpected status code for ${path}: ${status}"
    exit 1
  fi
done

security_txt="$(curl -sS "${SITE_URL}/.well-known/security.txt")"
security_txt_lower="$(printf '%s' "${security_txt}" | tr '[:upper:]' '[:lower:]')"
if [[ "${security_txt_lower}" != *"contact: mailto:"* ]]; then
  echo "security.txt missing a valid Contact mailto line."
  exit 1
fi
if [[ "${security_txt_lower}" != *"expires:"* ]]; then
  echo "security.txt missing Expires line."
  exit 1
fi
if [[ "${security_txt_lower}" != *"canonical:"* ]]; then
  echo "security.txt missing Canonical line."
  exit 1
fi

echo "Production audit passed for ${SITE_URL}"
