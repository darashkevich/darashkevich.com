#!/bin/bash
set -euo pipefail

SIGNATURE_NAME="Yahor Darashkevich"
SIGNATURE_UUID="919E21A0-3B8A-4F23-9A2A-12243F4E5EC2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRITE_SIG="${SCRIPT_DIR}/write-mailsignature.py"

MAIL_DIR=$(ls -d ~/Library/Mail/V*/MailData 2>/dev/null | sort -V | tail -1)
if [[ -z "${MAIL_DIR}" ]]; then
  echo "Error: Could not find ~/Library/Mail/V*/MailData"
  exit 1
fi

SIG_DIR="${MAIL_DIR}/Signatures"
ALL_SIGS="${SIG_DIR}/AllSignatures.plist"
SIG_FILE="${SIG_DIR}/${SIGNATURE_UUID}.mailsignature"

echo "Quitting Mail..."
osascript -e 'tell application "Mail" to quit' 2>/dev/null || true
for _ in $(seq 1 15); do
  pgrep -x Mail >/dev/null || break
  sleep 1
done
if pgrep -x Mail >/dev/null; then
  echo "Error: Mail is still running. Please quit Mail and re-run."
  exit 1
fi

# Unlock from any prior install so we can rewrite.
chflags nouchg "${SIG_FILE}" "${ALL_SIGS}" 2>/dev/null || true

if ! /usr/libexec/PlistBuddy -c "Print" "${ALL_SIGS}" 2>/dev/null | grep -q "${SIGNATURE_UUID}"; then
  echo "Error: Signature UUID not in AllSignatures.plist."
  echo "Open Mail, create a signature named '${SIGNATURE_NAME}', quit Mail, re-run."
  exit 1
fi

echo "Setting SignatureIsRich=true..."
python3 - "${ALL_SIGS}" "${SIGNATURE_NAME}" <<'PY'
import plistlib, sys
from pathlib import Path

path = Path(sys.argv[1])
name = sys.argv[2]
data = plistlib.loads(path.read_bytes())
for item in data:
    if item.get("SignatureName") == name:
        item["SignatureIsRich"] = True
        break
else:
    raise SystemExit(f"Signature not found: {name}")
path.write_bytes(plistlib.dumps(data))
PY

EXTRA_ARGS=()
if [[ "${1:-}" == "--base64-icons" ]]; then
  EXTRA_ARGS=(--base64-icons)
fi

echo "Writing Teams-format .mailsignature (${SIGNATURE_UUID})..."
if ((${#EXTRA_ARGS[@]})); then
  python3 "${WRITE_SIG}" "${SIG_FILE}" "${SIGNATURE_UUID}" "${EXTRA_ARGS[@]}"
else
  python3 "${WRITE_SIG}" "${SIG_FILE}" "${SIGNATURE_UUID}"
fi

if [[ ! -s "${SIG_FILE}" ]]; then
  echo "Error: ${SIG_FILE} is missing or empty after write."
  exit 1
fi

# iCloud sync deletes the file and resets SignatureIsRich=false when Mail opens
# unless the on-disk files are locked. Re-run starts by unlocking (chflags nouchg).
echo "Locking signature files against iCloud revert..."
chflags uchg "${SIG_FILE}" "${ALL_SIGS}"

echo "Opening Mail..."
open -a Mail

echo ""
echo "Signature installed: ${SIGNATURE_NAME}"
echo "UUID: ${SIGNATURE_UUID}"
echo "File: ${SIG_FILE} ($(wc -c < "${SIG_FILE}") bytes)"
echo ""
echo "Verify: Mail > Settings > Signatures — select '${SIGNATURE_NAME}'."
echo "To update later: chflags nouchg '${SIG_FILE}' '${ALL_SIGS}' then re-run this script."
