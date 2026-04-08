# E2E Playwright Maintenance

Run, fix, or stabilize local Playwright tests under `tests/e2e`.

$ARGUMENTS

## Current project baseline
- Playwright config: `tests/e2e/playwright.config.ts`
- Local app URL: `http://localhost:3000`
- Backend URL: `http://localhost:3001`

## Run procedure

1. Provide a concise plan and wait for explicit user approval before making any changes.
2. Prefer the VS Code Testing panel or `runTests` integration for scoped runs.
3. Ensure PostgreSQL is running and `DATABASE_URL` in `.env.server` points to it.
4. Apply the DB reset rule from `.github/instructions/database-operations.instructions.md` when schema/migrations/fixtures changed.
5. Check if the frontend is already healthy before starting:
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
   - If healthy → reuse. If not → `npm run wasp:start:bg` (automation) or `npm run wasp:start` (interactive).
6. If failures look bizarre after app is up, run `npm run wasp:restart` and inspect `out/wasp-dev.log`.

## Seeded user credentials
- Non-admin: `seed+user.01@example.test` / `12345678`
- Admin: `seed+system_admin.01@example.test` / `12345678`
- Instructor: `seed+instructor.01@example.test` / `12345678`

## Auth selector strategy
- Do NOT key critical actions off literal English button text (e.g., "Log in") — use `button[type='submit']` or form-scoped role queries.
- Use text assertions to verify translation behavior, not to drive login flows.

## Common failures and fixes
- `ERR_CONNECTION_REFUSED http://localhost:3000` — frontend not ready; wait for startup.
- Title loads but React UI blank — declaration import/export mismatch in `main.wasp`; restart with `npm run wasp:restart`.
- Tests pass in CLI but fail in VS Code panel — ensure Playwright extension is installed and config resolves from `tests/e2e`.
- `Port 5432 already in use` — stop conflicting DB or use it intentionally.

## Guardrails
- Do not edit generated Wasp output (`.wasp/out/**`).
- Keep non-source artifacts under `out/` (e.g., `out/test-results`, `out/playwright-report`, `out/wasp-dev.log`).
- Keep `tests/e2e/global-setup.ts` focused on readiness polling only — no DB resets or Wasp startup logic.