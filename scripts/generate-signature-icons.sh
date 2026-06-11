#!/bin/bash
# Regenerate 96x96 retina PNG icons from SVG sources (sharp).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"
node "${SCRIPT_DIR}/render-signature-icons.mjs"
