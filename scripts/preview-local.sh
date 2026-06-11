#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${ASTRO_PREVIEW_WORKDIR:-/tmp/darashkevich-astro-preview}"
PORT="${ASTRO_PREVIEW_PORT:-4321}"
HOST="${ASTRO_PREVIEW_HOST:-127.0.0.1}"

echo "→ Syncing source to ${WORK}"
rm -rf "$WORK"
mkdir -p "$WORK"
rsync -a \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  "$ROOT/" "$WORK/"

cd "$WORK"

if [[ ! -d node_modules ]]; then
  echo "→ Installing dependencies (first run only)"
  npm ci
fi

echo "→ Building"
node node_modules/astro/bin/astro.mjs build

echo "→ Copying dist back to project"
rsync -a "$WORK/dist/" "$ROOT/dist/"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "→ Stopping existing process on port ${PORT}"
  lsof -tiTCP:"$PORT" -sTCP:LISTEN | xargs kill 2>/dev/null || true
  sleep 0.5
fi

echo "→ Preview: http://${HOST}:${PORT}/"
exec node node_modules/astro/bin/astro.mjs preview --host "$HOST" --port "$PORT"
