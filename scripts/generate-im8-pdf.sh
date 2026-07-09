#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="${ROOT}/deliverables/im8-cx-challenge/index.html"
OUTPUT_DIR="${ROOT}/deliverables/im8-cx-challenge"
DESKTOP_OUTPUT="/Users/yahor/Desktop/IM8_Beat_Claude_CX_Manager_Yahor_Darashkevich.pdf"

# Rebuild index.html from content.json before PDF export
node "${ROOT}/scripts/build-im8-doc.mjs"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi

if [[ ! -x "$CHROME" ]]; then
  echo "Error: Chrome or Chromium not found." >&2
  exit 1
fi

if [[ ! -f "$HTML" ]]; then
  echo "Error: HTML source not found at $HTML" >&2
  exit 1
fi

PDF_LOCAL="${OUTPUT_DIR}/IM8_Beat_Claude_CX_Manager_Yahor_Darashkevich.pdf"

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-first-run \
  --no-default-browser-check \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=10000 \
  --print-to-pdf="${PDF_LOCAL}" \
  "file://${HTML}"

cp "${PDF_LOCAL}" "${DESKTOP_OUTPUT}"

echo "Generated: ${PDF_LOCAL}"
echo "Copied to: ${DESKTOP_OUTPUT}"
