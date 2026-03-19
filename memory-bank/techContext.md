# Tech Context

## Stack
- Wasp 0.21+
- TypeScript / React
- Prisma + PostgreSQL
- Vitest (api-tests)
- Playwright (e2e-tests)
- Astro (blog)

## Repository map
- app/: Wasp application
- api-tests/: operation/API-level tests
- e2e-tests/: browser end-to-end tests
- blog/: docs site

## Workflow constraints
- Treat app/main.wasp as app structure source of truth.
- Treat app/schema.prisma as data model source of truth.
- Prefer runTests for test execution feedback.

## Local setup notes
- Requires env files in app/.
- Database and app server are started only when needed for a specific task.
