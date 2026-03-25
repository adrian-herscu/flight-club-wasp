# E2E tests

Canonical policy for change/fix testing workflow:
[.github/copilot-instructions.md#testing-workflow-policy](.github/copilot-instructions.md#testing-workflow-policy).

E2E runs use a fail-fast contract:

- `e2e-tests/global-setup.ts` prepares test state and app readiness before tests run.

```bash
cd e2e-tests && npm install
npm run e2e:regression
```

## Run Modes

Database and server are restarted.

### CLI

```bash
npn run e2e:xxx
```

where `xxx`:
- regression - the entire suite
- smoke - subset of regression
- regression:ui - the entire suite in playwright gui


### VSCode

It should run from test panel or from gutter.
Logs at `app/wasp-dev.log` for server errors.

## Environment Notes

- `CI` is provided by CI systems.
- `SKIP_EMAIL_VERIFICATION_IN_DEV` is optional for signup/email-verification flows.
