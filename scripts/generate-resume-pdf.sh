#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GENERATE_SCRIPT="${ROOT}/scripts/generate-resume-pdf.py"
VERIFY_SCRIPT="${ROOT}/scripts/verify-resume-pdf.py"
OUTPUT_SITE="${ROOT}/public/YD_resume.pdf"

python3 "${GENERATE_SCRIPT}"

python3 "${VERIFY_SCRIPT}" "${OUTPUT_SITE}"
