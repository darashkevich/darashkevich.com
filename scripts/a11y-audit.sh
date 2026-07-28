#!/usr/bin/env bash
# Run axe-core against the built site homepage.
# Usage: npm run a11y   (builds, serves dist, audits /)

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

PORT="${A11Y_PORT:-4173}"
BASE_URL="http://127.0.0.1:${PORT}"
BDM_PKG="browser-driver-manager@2.0.1"

npm run build

npx --yes serve dist -l "tcp://127.0.0.1:${PORT}" >/tmp/darashkevich-a11y-serve.log 2>&1 &
serve_pid=$!

cleanup() {
  kill "${serve_pid}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -fsS "${BASE_URL}/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "${BASE_URL}/" >/dev/null 2>&1; then
  echo "Preview server failed to start. Log:"
  cat /tmp/darashkevich-a11y-serve.log || true
  exit 1
fi

# Keep Chrome for Testing + ChromeDriver in sync (local + CI).
# Never eval installer stdout — parse KEY="value" lines only.
npx --yes "${BDM_PKG}" install chrome >/tmp/bdm-install.log

CHROME_TEST_PATH=""
CHROMEDRIVER_TEST_PATH=""
while IFS= read -r line || [[ -n "${line}" ]]; do
  case "${line}" in
    CHROME_TEST_PATH=*)
      CHROME_TEST_PATH="${line#CHROME_TEST_PATH=}"
      CHROME_TEST_PATH="${CHROME_TEST_PATH#\"}"
      CHROME_TEST_PATH="${CHROME_TEST_PATH%\"}"
      ;;
    CHROMEDRIVER_TEST_PATH=*)
      CHROMEDRIVER_TEST_PATH="${line#CHROMEDRIVER_TEST_PATH=}"
      CHROMEDRIVER_TEST_PATH="${CHROMEDRIVER_TEST_PATH#\"}"
      CHROMEDRIVER_TEST_PATH="${CHROMEDRIVER_TEST_PATH%\"}"
      ;;
  esac
done < <(npx --yes "${BDM_PKG}" which 2>/dev/null || true)

if [[ -z "${CHROMEDRIVER_TEST_PATH}" || -z "${CHROME_TEST_PATH}" ]]; then
  echo "Could not resolve Chrome/ChromeDriver via browser-driver-manager."
  cat /tmp/bdm-install.log || true
  exit 1
fi

export CHROME_BIN="${CHROME_TEST_PATH}"
echo "Chrome: ${CHROME_TEST_PATH}"
echo "ChromeDriver: ${CHROMEDRIVER_TEST_PATH}"
echo "Running axe against ${BASE_URL}/"
# Wait for CSS variables / layered color-mix surfaces to settle before contrast checks.
# Without this, axe-cli intermittently reports ~90 false color-contrast hits (muted text on
# an unset canvas) on both local serve and CI.
npx axe "${BASE_URL}/" \
  --chromedriver-path "${CHROMEDRIVER_TEST_PATH}" \
  --chrome-path "${CHROME_TEST_PATH}" \
  --exit \
  --tags wcag2a,wcag2aa \
  --timeout 90 \
  --load-delay 3000
