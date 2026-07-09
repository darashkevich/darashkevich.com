#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GENERATE_SCRIPT="${ROOT}/scripts/generate-resume-pdf.py"
OUTPUT_SITE="${ROOT}/public/YD_resume_ATS.pdf"
OUTPUT_DESKTOP="${HOME}/Desktop/YD_resume_ATS.pdf"

python3 "${GENERATE_SCRIPT}" --ats

if command -v pdftotext >/dev/null 2>&1; then
  echo ""
  echo "pdftotext extraction preview (first 40 lines):"
  pdftotext "${OUTPUT_DESKTOP}" - | head -n 40
  echo ""
  echo "pdftotext line count: $(pdftotext "${OUTPUT_DESKTOP}" - | wc -l | tr -d ' ')"
else
  echo "pdftotext not found — skipping text extraction check"
fi
