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
- title test passes but tests cannot find `Log in` or cookie-consent buttons
  - Cause: the HTML shell loaded, but the React app did not mount due to a stale/cached virtual entry or an `import` vs `importDefault` mismatch in `main.wasp.ts`
  - Fix: restart `wasp start`, inspect the browser console, and verify `main.wasp.ts` declaration import style matches component exports
- tests pass in CLI but fail in VS Code panel
  - Cause: extension/config mismatch
  - Fix: ensure Playwright extension installed and `playwright.config.ts` resolved from `e2e-tests`

## Auth smoke patterns (seeded-user login recipes)

### When to use
- Test existing-user login without signup side-effects (flakier, slower, email-dependent).
- Validate auth routes and redirects post-login.
- Validate authenticated UI state changes (e.g., "Log in" link disappears, username visible).

### Seeded user credentials (from `app/migrations/20260309103000_seed_users_by_role/migration.sql`)
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
- Test placement: append to existing suites if testing baseline auth (e.g., `landingPageTests.spec.ts`); create new spec for auth-focused matrix (signup/login/logout/role guards).

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
- Do not edit generated Wasp output (`app/.wasp/out/**`).
- Prefer fixing source config/script in `e2e-tests`.
- Keep desktop-first reliability; CI-specific behavior stays isolated behind `isCI`.
