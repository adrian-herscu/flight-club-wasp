#!/bin/bash
# Comprehensive server startup script for e2e tests
# Handles: DB state, migrations, and server startup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/../app"

echo "[E2E Setup] Starting comprehensive setup..."

# Change to app directory
cd "$APP_DIR"

# Clean up any stale containers from previous runs
echo "[E2E Setup] Cleaning up stale containers..."
docker ps -a --format "table {{.Names}}" 2>/dev/null | grep "opensaas-.*-db" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
sleep 1

# Just start wasp - it handles DB startup and migrations automatically
echo "[E2E Setup] Starting Wasp dev server (handles DB and migrations)..."
exec wasp start
