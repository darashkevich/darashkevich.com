#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://darashkevich.com}"
WWW_URL="${WWW_URL:-https://www.darashkevich.com}"
NETLIFY_FALLBACK_URL="${NETLIFY_FALLBACK_URL:-https://stalwart-profiterole-ca3dd0.netlify.app}"
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

flights_status="$(curl -sS -o /dev/null -w "%{http_code}" "${SITE_URL}/flights/")"
echo "${flights_status} /flights/ (unauthenticated)"
if [[ "${flights_status}" != "401" ]]; then
  echo "Expected /flights/ to require auth (401), got ${flights_status}"
  exit 1
fi

if [[ -n "${FLIGHTS_PAGE_PASSWORD:-}" ]]; then
  flights_auth_status="$(curl -sS -o /dev/null -w "%{http_code}" -u ":${FLIGHTS_PAGE_PASSWORD}" "${SITE_URL}/flights/")"
  echo "${flights_auth_status} /flights/ (authenticated)"
  if [[ "${flights_auth_status}" != "200" ]]; then
    echo "Authenticated /flights/ check failed with status ${flights_auth_status}"
    exit 1
  fi
fi

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

# Duplicate-host posture (warnings become soft failures via HOST_DUP_STRICT=1).
host_dup_issues=0
www_code="$(curl -sS -o /dev/null -w "%{http_code}" -L --max-redirs 0 "${WWW_URL}/" || true)"
echo "www host: ${www_code} ${WWW_URL}/"
if [[ "${www_code}" == "301" || "${www_code}" == "308" ]]; then
  echo "www permanently redirects (good)."
elif [[ "${www_code}" == "200" ]]; then
  echo "WARN: www returns 200 instead of a permanent redirect to the apex. Add a Cloudflare redirect rule."
  host_dup_issues=$((host_dup_issues + 1))
else
  echo "WARN: unexpected www status ${www_code}"
  host_dup_issues=$((host_dup_issues + 1))
fi

netlify_code="$(curl -sS -o /dev/null -w "%{http_code}" -L --max-redirs 0 "${NETLIFY_FALLBACK_URL}/" || true)"
netlify_headers="$(curl -sS -I -L --max-redirs 0 "${NETLIFY_FALLBACK_URL}/" 2>/dev/null | tr '[:upper:]' '[:lower:]' || true)"
echo "Netlify fallback: ${netlify_code} ${NETLIFY_FALLBACK_URL}/"
if [[ "${netlify_code}" == "301" || "${netlify_code}" == "308" ]]; then
  echo "Netlify fallback permanently redirects (good)."
elif [[ "${netlify_headers}" == *"x-robots-tag:"*"noindex"* ]]; then
  echo "Netlify fallback is noindex (acceptable while kept for rollback)."
elif [[ "${netlify_code}" == "200" ]]; then
  echo "WARN: Netlify fallback returns indexable 200. Redeploy Netlify with X-Robots-Tag noindex or unpublish the site."
  host_dup_issues=$((host_dup_issues + 1))
elif [[ "${netlify_code}" == "404" || "${netlify_code}" == "000" ]]; then
  echo "Netlify fallback appears unpublished/unreachable (good)."
else
  echo "WARN: unexpected Netlify fallback status ${netlify_code}"
  host_dup_issues=$((host_dup_issues + 1))
fi

netlify_flights="$(curl -sS -o /dev/null -w "%{http_code}" "${NETLIFY_FALLBACK_URL}/flights/" || true)"
echo "${netlify_flights} ${NETLIFY_FALLBACK_URL}/flights/ (unauthenticated)"
if [[ "${netlify_code}" == "200" && "${netlify_flights}" != "401" && "${netlify_flights}" != "404" && "${netlify_flights}" != "000" ]]; then
  echo "WARN: Netlify /flights/ is reachable without 401 while the fallback host is live."
  host_dup_issues=$((host_dup_issues + 1))
fi

if (( host_dup_issues > 0 )); then
  if [[ "${HOST_DUP_STRICT:-0}" == "1" ]]; then
    echo "Host duplication checks failed (${host_dup_issues})."
    exit 1
  fi
  echo "Host duplication warnings: ${host_dup_issues} (set HOST_DUP_STRICT=1 to fail)."
fi

echo "Production audit passed for ${SITE_URL}"
