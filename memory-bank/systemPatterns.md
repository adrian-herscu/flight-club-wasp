# System Patterns

## Architecture
- Monorepo with separate app, API tests, and E2E tests.
- Wasp app as source of truth for operations and app wiring.
- Prisma schema as source of truth for data models and relations.

## Key patterns in use
- Role-gated server operations with explicit authorization checks.
- Deterministic seed IDs used by API tests for stable fixtures.
- Dedicated cleanup helpers to isolate test cases.
- Playwright E2E coverage for user-facing role/navigation workflows.

## Testing patterns
- API tests validate operation-level behavior and HTTP-like error shapes.
- E2E tests validate real UI flows and role-based navigation/access.
- Prefer focused test runs first, then expand by impact.

## Decision notes
- Keep test IDs deterministic in seed migrations to minimize flaky setup.
- Keep role checks centralized in operation layer.
