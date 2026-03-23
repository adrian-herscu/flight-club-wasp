# Flight Club Platform

[![Deploy](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml)
[![E2E Report](https://img.shields.io/badge/E2E%20Report-GitHub%20Pages-2EAD33?logo=playwright&logoColor=white)](https://adrian-herscu.github.io/flight-club-wasp/)
[![Wasp](https://img.shields.io/badge/Wasp-0.21-7857FF?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHoiLz48L3N2Zz4=&logoColor=white)](https://wasp.sh)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-0B0D0E?logo=railway&logoColor=white)](https://flight-club-wasp-client-production.up.railway.app/)

A multi-role flight school management platform. Built with [Wasp](https://wasp.sh) on top of the [Open SaaS](https://opensaas.sh) template, backed by PostgreSQL via Prisma.

## What it does

Flight Club lets flight schools, instructors, and students find each other and manage the full lifecycle of a course — from public discovery through syllabus setup, enrollment, and instructor assignment.

**Roles supported:** Anonymous visitor · Registered user · System admin · School manager · Instructor · Student

**Key capabilities:**

- Public landing page with school and course discovery (filter by country, location, course name)
- Authenticated role-request and approval workflows (admin approves managers; managers approve instructors and students)
- School profile management (logo, website, contact details)
- Syllabus catalog — create, publish, and reuse syllabuses
- Course creation, instructor assignment, and student enrollment

## Repository layout

| Directory | Purpose |
|-----------|---------|
| `app/` | Wasp web application (TypeScript, React, Prisma, PostgreSQL) |
| `e2e-tests/` | Playwright end-to-end test suite |
| `api-tests/` | Vitest operation-level API tests (no browser, no server required) |

## Quick start

### Prerequisites

- [Wasp CLI](https://wasp.sh/docs/quick-start) ≥ 0.21
- Node.js 18+
- Docker (for the local PostgreSQL database)

### Running locally

```bash
# 1a. Start the Wasp-managed database (only if DATABASE_URL is NOT set in app/.env.server)
cd app && wasp start db

# 1b. Or start your own PostgreSQL and set DATABASE_URL in app/.env.server
#     e.g. DATABASE_URL=postgres://postgres:postgres@localhost:5432/flight_club_wasp

# 2. Apply migrations (first run, or after schema changes)
wasp db migrate-dev

# 3. Start the app (keep it running)
wasp start
```

The app will be available at `http://localhost:3000`.

### Environment files

Copy and fill in the required values before starting:

```bash
cp app/.env.server.example app/.env.server
cp app/.env.client.example app/.env.client
```

### Running E2E tests

Canonical policy for change/fix testing workflow:
[.github/copilot-instructions.md#testing-workflow-policy](.github/copilot-instructions.md#testing-workflow-policy).

E2E runs use a fail-fast contract:

- `e2e-tests/global-setup.ts` prepares test state and app readiness before tests run.

```bash
cd e2e-tests && npm install
npm run e2e:regression
```

### E2E run modes

1. Command line (recommended): `cd e2e-tests && npm run e2e:regression`
2. VS Code Testing panel (Playwright extension: `ms-playwright.playwright`)
3. Interactive UI mode: `cd e2e-tests && npm run e2e:regression:ui`

### E2E runtime behavior

- `e2e-tests/global-setup.ts` checks readiness for:
	- `http://127.0.0.1:3000`
	- `tcp:127.0.0.1:3001`
- it runs DB reset once per Playwright invocation.
- if app is not ready after reset, it starts `wasp start` in background and waits until both ports are ready.
- `e2e-tests/playwright.config.ts` uses `baseURL` `http://127.0.0.1:3000`; app auto-start is handled by `global-setup.ts`, not Playwright config.

### E2E troubleshooting (quick)

- Tests timeout initially: inspect `app/wasp-dev.log` for startup errors.
- Port conflict: stop conflicting process or align app/test ports.
- CI failures only: ensure CI starts app and waits for readiness before Playwright.

### E2E environment notes

- `CI` is provided by CI systems.
- `SKIP_EMAIL_VERIFICATION_IN_DEV` is optional for signup/email-verification flows.
- `e2e:regression:ui` runs playwright in ui mode.

## Documentation

- [Product Requirements](app/docs/prd.md)
- [Data Design](app/docs/data-design.md)
- [Software Test Design](app/docs/std.md)
