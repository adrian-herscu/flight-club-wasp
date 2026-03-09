# Skill: Local E2E Playwright Run + Maintenance (Desktop)

Use this skill when running or fixing `e2e-tests` locally (CLI or VS Code Testing panel).

## Current project baseline
- Playwright config: `e2e-tests/playwright.config.ts`
- Local startup script: `e2e-tests/start-local-e2e.sh`
- Local app URL expected by tests: `http://localhost:3000`
- Backend URL (Wasp server): `http://localhost:3001`
- VS Code recommendations/settings under `e2e-tests/.vscode`

## Run procedure (desktop)
1. From `e2e-tests`, run Playwright (`npm run e2e:playwright`) or run from VS Code Testing panel.
2. Let Playwright `webServer` manage startup:
   - If app is already running, `reuseExistingServer: true` reuses it.
   - If app is not running, Playwright runs `bash ./start-local-e2e.sh`.
3. Wait until `http://localhost:3000` returns HTTP 200 before asserting test failures.

## Startup behavior to preserve
- Keep `baseURL` and `webServer.url` aligned to `http://localhost:3000`.
- Keep local `webServer.reuseExistingServer: true`.
- Keep CI and local startup separated (`isCI` branch).
- Keep long startup timeout for first compile (`10 * 60 * 1000` currently).

## Maintenance checklist
1. Validate config after edits:
   - `use.baseURL` is `http://localhost:3000`
   - local `webServer.command` points to `start-local-e2e.sh`
   - CI `webServer.command` uses `run-wasp-app`
2. Keep startup script non-interactive:
   - no prompts
   - tolerate DB already running (`wasp db start` may fail on port 5432 already used)
3. Verify with a fast smoke test first:
   - run only `landingPageTests.spec.ts` test `has title`
4. Then run full suite.

## Common failures and fixes
- `ERR_CONNECTION_REFUSED http://localhost:3000`
  - Cause: frontend not ready yet or wrong `webServer.url`
  - Fix: wait for startup; ensure URL is `3000`, not `3001`
- `Process from config.webServer was not able to start. Exit code: 1`
  - Cause: startup command failed
  - Fix: run startup command manually and inspect logs
- `Port 5432 already in use`
  - Cause: existing local PostgreSQL instance
  - Fix: allow fallback path in startup script and continue with existing DB
- tests pass in CLI but fail in VS Code panel
  - Cause: extension/config mismatch
  - Fix: ensure Playwright extension installed and `playwright.config.ts` resolved from `e2e-tests`

## Guardrails
- Do not edit generated Wasp output (`app/.wasp/out/**`).
- Prefer fixing source config/script in `e2e-tests`.
- Keep desktop-first reliability; CI-specific behavior stays isolated behind `isCI`.
