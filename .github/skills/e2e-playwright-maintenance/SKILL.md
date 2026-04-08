---
name: e2e-playwright-maintenance
description: Local Playwright maintenance workflow for this repository. Use when running, fixing, or stabilizing tests under tests/e2e, validating Playwright config, debugging local app startup issues, or investigating flaky browser-based regressions.
---

# Skill: Local tests/e2e Playwright Run + Maintenance (Desktop)

Use this skill when running or fixing `tests/e2e` locally (CLI or VS Code Testing panel).

## Current project baseline
- Playwright config: `tests/e2e/playwright.config.ts`
- Local app URL expected by tests: `http://localhost:3000`
- Backend URL (Wasp server): `http://localhost:3001`

## Run procedure (desktop)
0. Provide a concise implementation plan and wait for explicit user approval before making any test/code/config changes.
1. Prefer the configured test tooling (`runTests` integration) or the VS Code Testing panel for scoped runs; use the package script only when you specifically need the full local shell flow.
2. Ensure PostgreSQL is running and `DATABASE_URL` in the project root `.env.server` points to it.
3. Apply the repo DB reset rule from `.github/instructions/database-operations.instructions.md` when schema, migrations, or deterministic fixtures changed.
4. Before E2E execution, check whether the frontend is already healthy and reuse it when possible, for example:
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
  - If the response is healthy, reuse the running app.
  - If the response is unhealthy or nothing is listening, start Wasp explicitly (`npm run wasp:start:bg` for automation-style flow, or `npm run wasp:start` for interactive local flow).
5. If failures look bizarre after the app is up (for example title renders but React UI does not mount), run `npm run wasp:restart` and inspect `out/wasp-dev.log` before deeper debugging.
6. `tests/e2e/global-setup.ts` should only verify app readiness on `127.0.0.1:3000`/`3001`.

### `wasp:start:bg` contract
- `npm run wasp:start:bg` must spawn Wasp detached and exit immediately.
- Startup logs are written to `out/wasp-dev.log`.
- Background PID is written to `out/.wasp-dev.pid`.

## Startup behavior to preserve
- Keep `baseURL` aligned to `http://127.0.0.1:3000`.
- Keep startup/reset orchestration in scripts/CI actions, not in Playwright config.
- Keep server health-check and reuse/start logic in scripts or the invoking workflow, not in Playwright config.
- Keep `tests/e2e/global-setup.ts` focused on readiness polling only.

## Maintenance checklist
1. Validate config after edits:
  - `use.baseURL` is `http://127.0.0.1:3000`
  - no stale `webServer.command` references to deleted scripts
  - `tests/e2e/global-setup.ts` does not reset DB or spawn/kill Wasp; it only polls readiness
2. Verify with a fast smoke test first:
  - run only `04-01-public-discovery.spec.ts` test `has title`
3. Then run full suite.

## Common failures and fixes
- `ERR_CONNECTION_REFUSED http://localhost:3000`
  - Cause: frontend not ready yet or wrong `webServer.url`
  - Fix: wait for startup; ensure URL is `3000`, not `3001`
- `Process from config.webServer was not able to start. Exit code: 1`
  - Cause: stale Playwright `webServer` config was reintroduced
  - Fix: remove/adjust `webServer` block to match fail-fast model
- `Port 5432 already in use`
  - Cause: existing local PostgreSQL instance while running `wasp start`
  - Fix: stop conflicting DB or use the existing DB intentionally
- title test passes but tests cannot find `Log in` or cookie-consent buttons
  - Cause: the HTML shell loaded, but the React app did not mount due to a stale/cached virtual entry or a declaration import/export mismatch in `main.wasp`
  - Fix: reuse the current server only if it is healthy; otherwise restart with `npm run wasp:restart`, inspect the browser console, and verify `main.wasp` declaration imports align with component exports
- tests pass in CLI but fail in VS Code panel
  - Cause: extension/config mismatch
  - Fix: ensure Playwright extension installed and `playwright.config.ts` resolved from `tests/e2e`

## Auth smoke patterns (seeded-user login recipes)

### When to use
- Test existing-user login without signup side-effects (flakier, slower, email-dependent).
- Validate auth routes and redirects post-login.
- Validate authenticated UI state changes (e.g., "Log in" link disappears, username visible).

### Seeded user credentials (from `migrations/20260309103000_seed_users_by_role/migration.sql`)
- Baseline non-admin: `seed+user.01@example.test` / `12345678`
- Admin: `seed+system_admin.01@example.test` / `12345678`
- Instructor: `seed+instructor.01@example.test` / `12345678`
- All seeded users have `isEmailVerified: true` and shared password hash.

### Helper pattern: flexible `logUserIn()`
```typescript
export const logUserIn = async ({
  page,
  user,
  expectedRedirectPath = "/",
}: {
  page: Page;
  user: User;
  expectedRedirectPath?: string;
}) => {
  // Accepts user.password (optional, defaults to DEFAULT_PASSWORD for signup-created users)
  // Accepts expectedRedirectPath (optional, defaults to "/" per onAuthSucceededRedirectTo config)
}
```

### Minimal login-success assertion template
```typescript
test("existing seeded user can log in", async ({ page }) => {
  await logUserIn({
    page,
    user: {
      email: "seed+user.01@example.test",
      password: "12345678",
    },
    expectedRedirectPath: "/",
  });
  // Assert one authenticated UI signal (e.g., username visible, "Log in" link gone)
  await expect(page.getByText("user_01")).toBeVisible();
});
```

### Design rules
- Helpers: avoid hardcoded redirect paths; accept `expectedRedirectPath` from caller.
- Assertions: validate login response status `200`, URL leaves `/login`, plus one lightweight UI confirmation.
- Test placement: append to existing suites if testing baseline auth (e.g., `04-01-public-discovery.spec.ts`); create new spec for auth-focused matrix (signup/login/logout/role guards).

### Selector strategy for translated auth UI
- For auth forms in this repo, do not key critical actions off literal English button text like `Log in`.
- Prefer stable selectors such as `button[type='submit']`, form-scoped role queries, or other language-agnostic locators.
- Use text assertions to verify translation behavior, not to drive the login flow itself.
- If a login helper starts failing after i18n changes, replace text-coupled selectors before investigating auth logic.

### Isolate locale-mutating Playwright tests
- If a test changes app language, RTL mode, or `localStorage` locale keys, avoid sharing that `page` across unrelated tests.
- Prefer one of:
  1. Playwright's per-test `page` fixture, or
  2. a dedicated `browser.newContext()` / `newPage()` inside the locale-changing test.
- Use isolated contexts especially for translation toggle tests, since locale state can leak between tests and make assertions order-dependent.
- When a translation test passes alone but fails in the suite, check for shared page/context state before changing product code.

## Generic test-engineering patterns

### 1) Policy matrix coverage
- Represent key policy decisions as a matrix (who can see/use/edit by status/scope).
- Add at least one positive and one negative test per matrix row.
- Keep assertions focused on user-visible behavior + server response correctness.

### 2) Deterministic test data first
- Prefer seeded accounts/entities over runtime-created test data for auth/role flows.
- Use fixed identifiers and credentials for repeatability.
- Keep one helper API per repeated user journey (login, signup, checkout, etc.).

### 3) Guard against generated-type/import drift
- After operation declaration changes (`main.wasp`), restart local app before debugging failing tests deeply.
- If tests fail with import/type mismatches, verify app compiles and generated operations are refreshed first.

### 4) Layered verification strategy
- UI assertion (visible state)
- Network assertion (status code/endpoint success)
- Navigation assertion (expected route)

Use all three for critical flows to reduce false positives.

## Guardrails
- Plan-first gate: do not edit files or run validation-changing actions before the user approves the plan.
- Do not edit generated Wasp output (`.wasp/out/**`).
- Prefer fixing source config/script in `tests/e2e`.
- Keep the fail-fast contract explicit: tests/e2e reuses a healthy existing app when available, otherwise the invoking workflow must start it before the suite runs.

## Generated artifacts policy
- Keep non-source artifacts under `out/` (for example `out/test-results`, `out/playwright-report`, `out/coverage`, `out/wasp-dev.log`).
- Keep `.wasp/out/**` reserved for Wasp-generated code/build output.
