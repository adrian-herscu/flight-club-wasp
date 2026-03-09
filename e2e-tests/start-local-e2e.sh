#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../app"

echo "[e2e] Ensuring DB is available..."
if ! wasp db start; then
  echo "[e2e] 'wasp db start' failed (port 5432 may already be in use). Continuing with existing DB..."
fi

echo "[e2e] Starting app server..."
exec wasp start
