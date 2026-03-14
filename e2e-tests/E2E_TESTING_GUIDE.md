# E2E Testing Setup & Guide

## Overview

This project uses a simple fail-fast e2e workflow:
- Start the Wasp app first.
- Run Playwright tests after the app is reachable.
- If the app is not reachable, tests fail quickly.

## Quick Start

## Mandatory change/fix workflow

Follow the canonical testing policy in [../.github/copilot-instructions.md](../.github/copilot-instructions.md#testing-workflow-policy).

In short: keep baseline green, use test-first for fixes, and choose focused vs full-suite runs based on impact.

### Option 1: Command Line (Recommended)

```bash
# Terminal 1
cd ../app
wasp start

# Terminal 2
cd e2e-tests
npm run e2e:playwright
```

`npm run e2e:playwright` waits briefly for `http://127.0.0.1:3000` and fails fast if it is not available.

### Option 2: VS Code Tests Panel

1. Install: **Playwright Test for VS Code** extension (`ms-playwright.playwright`)
2. Click the **Testing** icon in VS Code sidebar (Ctrl+Shift+X → Testing)
3. Click the play button ▶️ to run tests

Tests will automatically:
- Reuse the already running server
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
| Server already running | Playwright uses it |
| Server not running | `wait-on` precheck fails quickly |
| DB/migrations state | Managed by your `wasp start` process |

## Files

- **`playwright.config.ts`** - Main Playwright config
  - Uses `baseURL` `http://127.0.0.1:3000`
  - No `webServer` auto-start command

- **`package.json`** - NPM scripts
  - `e2e:playwright` - `wait-on` + Playwright test run
  - `local:e2e:playwright:ui` - Interactive Playwright UI mode

## Scenarios & What Happens

### Scenario 1: Fresh checkout, nothing running
```bash
npm run e2e:playwright
# Fails fast (server is not running) ❌
```

### Scenario 2: Server already running from development
```bash
# Terminal 1: wasp start (still running)
# Terminal 2:
npm run e2e:playwright
# Uses running server → Runs tests ✅
```

### Scenario 3: Previous test run left server active
```bash
npm run e2e:playwright
# Reuses existing server → Runs tests ✅
```

### Scenario 4: DB/migration issue
```bash
# Fix by restarting app process
cd ../app && wasp start
```

## Timeouts

- `wait-on` timeout is configured in `package.json` (`-t 5000`).
- Increase this value if your app startup is slower in your environment.

## Troubleshooting

### Tests timeout on first run
- **Cause**: app server was not started or not ready quickly enough.
- **Solution**: start `wasp start` first, then run e2e.

### Port already in use
- **Cause**: another app process is using 3000.
- **Solution**: stop conflicting process or point app/tests to matching port.

### Database connection errors
- **Cause**: Wasp app process could not reach DB.
- **Solution**: inspect `wasp start` logs and DB availability.

### Tests pass locally but fail in CI
- **Check**: CI starts app server before running e2e.
- **Solution**: add explicit startup + readiness check in CI workflow.

## Environment Variables

- **`CI`** - Set by CI system.
- **`SKIP_EMAIL_VERIFICATION_IN_DEV`** - Optional for signup/email-verification test flows.

## Notes

- Tests assume the app server is already running.
- Fail-fast behavior is intentional to keep feedback quick.
- Keep app startup and e2e execution as separate steps.
