#!/bin/bash
# Regenerate PNG icons from SVG sources (macOS qlmanage + sips).
set -euo pipefail
ICON_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/signature/icons"
for f in email phone linkedin website; do
  qlmanage -t -s 48 -o "$ICON_DIR" "$ICON_DIR/$f.svg" >/dev/null 2>&1
  mv -f "$ICON_DIR/$f.svg.png" "$ICON_DIR/$f.png"
  sips -z 24 24 "$ICON_DIR/$f.png" >/dev/null
done
echo "Icons written to $ICON_DIR/*.png"
