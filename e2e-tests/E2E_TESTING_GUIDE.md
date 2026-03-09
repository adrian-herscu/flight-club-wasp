# E2E Testing Setup & Guide

## Overview

This project has a comprehensive e2e testing setup that works reliably in all scenarios:
- **No prerequisites**: Tests auto-start everything needed (DB, migrations, server)
- **Desktop & VS Code**: Works from command line and VS Code tests panel
- **Idempotent**: Safe to run multiple times - handles all server states
- **CI-ready**: Special handling for CI environments

## Quick Start

### Option 1: Command Line (Recommended)

```bash
cd e2e-tests
npm run e2e:playwright
```

**What happens automatically:**
1. ✅ Cleans up any stale Docker containers
2. ✅ Starts PostgreSQL database in Docker
3. ✅ Runs all pending migrations
4. ✅ Compiles and starts Wasp dev server
5. ✅ Runs all tests
6. ✅ Cleans up (keeps server running for next run)

**First run**: ~5-10 minutes (includes build)  
**Subsequent runs**: ~2-3 minutes (server reuses if already running)

### Option 2: VS Code Tests Panel

1. Install: **Playwright Test for VS Code** extension (`ms-playwright.playwright`)
2. Click the **Testing** icon in VS Code sidebar (Ctrl+Shift+X → Testing)
3. Click the play button ▶️ to run tests

Tests will automatically:
- Start/reuse the server
- Run in the panel
- Show pass/fail status

### Option 3: Manual Server (if you prefer)

```bash
# Terminal 1: Start the app manually
cd app
wasp start

# Terminal 2: Run tests (reuses the running server)
cd e2e-tests
npm run e2e:playwright
```

## What's Handled Automatically

| Scenario | Handled By |
|----------|-----------|
| DB not started | `start-server.sh` + Wasp |
| DB already running | Wasp reuses it |
| Migrations not applied | Wasp runs them automatically |
| Stale Docker containers | `start-server.sh` cleans them up |
| Server not running | `start-server.sh` starts Wasp |
| Server already running | Playwright reuses it |
| Port conflicts | Docker/Wasp handle isolation |

## Files

- **`playwright.config.ts`** - Main Playwright config
  - Desktop mode: Uses `start-server.sh` (reusable, long timeout)
  - CI mode: Uses `run-wasp-app` (isolated, clean state)

- **`start-server.sh`** - Bootstrap script
  - Cleans up stale containers
  - Starts Wasp (which handles DB + migrations)
  - All idempotent

- **`package.json`** - NPM scripts
  - `e2e:playwright` - Run all tests
  - `local:e2e:playwright:ui` - Run with UI (deprecated - use VS Code panel)

## Scenarios & What Happens

### Scenario 1: Fresh checkout, nothing running
```bash
npm run e2e:playwright
# Starts DB → Runs migrations → Starts server → Runs tests ✅
```

### Scenario 2: Server already running from development
```bash
# Terminal 1: wasp start (still running)
# Terminal 2:
npm run e2e:playwright
# Reuses running server → Runs tests ✅
```

### Scenario 3: Previous test run left server active
```bash
npm run e2e:playwright
# Reuses existing server → Runs tests ✅
```

### Scenario 4: Stale containers from crash
```bash
npm run e2e:playwright
# Cleans up stale containers → Starts fresh DB → Runs tests ✅
```

## Timeouts

- **Desktop mode**: 10 minutes (for first-time builds)
- **Subsequent runs**: ~2-3 minutes actual (timeout not usually hit)
- **Increase if needed**: Edit `playwright.config.ts` `timeout` value

## Troubleshooting

### Tests timeout on first run
- **Normal**: First build can take 5-10 minutes. Check app/logs
- **Solution**: Wait or increase timeout in `playwright.config.ts`

### Port already in use
- **Cause**: Previous test run didn't clean up
- **Solution**: `npm run e2e:playwright` will auto-cleanup next time
- **Manual fix**: `docker ps -a | grep opensaas | xargs docker rm -f`

### Database connection errors
- **Cause**: Stale container state
- **Solution**: `docker system prune -a` (aggressive cleanup)

### Tests pass locally but fail in CI
- **Check**: `process.env.CI` is being set
- **Solution**: CI should use `run-wasp-app` path (automatic)

## Environment Variables

- **`CI`** - Set by CI system, enables CI-specific webServer config
- None needed for local development

## Notes

- Tests reuse server by default (idempotent)
- Each Playwright run gets fresh Docker container (isolated)
- Server stays running after tests for development use
- Safe to run multiple times without cleanup
