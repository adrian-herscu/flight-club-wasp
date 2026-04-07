---
description: 'Performance optimization guidance tailored to this Wasp + React + Prisma + PostgreSQL + Vite + Tailwind/ShadCN + Vitest + Playwright project.'
applyTo: 'main.wasp, schema.prisma, prisma.config.ts, vite.config.ts, vitest.config.ts, components.json, src/**/*.{ts,tsx,css}, tests/api/**/*.ts, tests/e2e/**/*.ts'
---

# Performance Optimization for Flight Club (Wasp Stack)

## Scope and Principles

- Measure before optimizing. Regressions must be supported by profiler output, query plans, test timings, or bundle analysis.
- Optimize the hot path first: login, sidebar navigation, school/course listing, and registration workflows.
- Prefer clear, maintainable code. Keep non-obvious optimizations documented with a short rationale.
- Minimize payloads, queries, and render work before adding infrastructure complexity.

## Wasp Server Performance

### Queries, Actions, and APIs

- Keep operation boundaries tight in `main.wasp`: declare only entities the operation needs.
- Prefer Wasp queries/actions for internal app traffic and reserve HTTP APIs for external integrations.
- Keep responses small and purpose-built for the calling UI.
- Avoid server-side blocking calls in operation code paths.

### Operation Implementation Patterns

- In operation handlers, prefer single-pass data access over chained queries where possible.
- Return explicit DTO-like objects instead of full model shapes when UI needs only a subset.
- For list endpoints, enforce pagination with deterministic ordering.
- For write-heavy flows, keep validation and authorization checks early to fail fast.

## Prisma and PostgreSQL Performance

### Query Shaping

- Use `select` by default; avoid fetching whole rows unless required.
- Avoid N+1 patterns by loading related data intentionally with `include` or relation `select`.
- Avoid unbounded `findMany` in app paths. Always use `take` and stable ordering.
- Prefer targeted `where` clauses on indexed columns.

### Pagination Strategy

- Use offset pagination for small, stable admin lists.
- Use cursor pagination for large or frequently mutating datasets.
- Keep page sizes consistent per endpoint unless there is a documented reason.

### Transactions and Consistency

- Use `$transaction` for coupled reads/writes that must stay consistent.
- Keep transactions short; avoid long-running work while holding DB locks.
- Validate complex query performance with `EXPLAIN ANALYZE` before and after changes.

### Index and Schema Guidance

- Add indexes for frequent filters, joins, and sort keys.
- Remove unused indexes to reduce write overhead.
- Treat `schema.prisma` as source of truth and keep index intent explicit in code review notes.

## React 19 Client Performance

### Rendering Discipline

- Avoid unnecessary state in high-level layout components.
- Use `useMemo` and `useCallback` only for measurable rerender pressure.
- Prefer derived values over duplicated state.
- Memoize expensive list item components when parent rerenders are frequent.

### Interaction Responsiveness

- Use `useTransition` for non-urgent updates such as filter and pagination UI.
- Debounce high-frequency inputs that trigger server calls.
- Keep loading and empty states cheap to render.

### Routing and Code Splitting

- Split route-level heavy modules using dynamic imports when payload size grows.
- Keep marketing/public routes lightweight and isolated from portal-only dependencies.
- Avoid loading editor-heavy or chart-heavy components before user intent is clear.

## Vite, Tailwind, and ShadCN Performance

### Build and Bundle Hygiene

- Watch bundle growth after dependency additions.
- Favor tree-shakeable imports and avoid broad barrel imports from large libraries.
- Keep CSS growth in check; remove stale utility usage when refactoring UI.

### ShadCN and UI Components

- Reuse existing components in `src/client/components/ui` before adding new wrappers.
- Keep component composition shallow in frequently rerendered views.
- Avoid prop patterns that force large subtree rerenders.

## External Integration Performance

### Network and Retry Policy

- For third-party providers (SendGrid, Stripe, OpenAI, S3), set timeouts and bounded retries.
- Avoid duplicate requests by making retries idempotent where possible.
- Batch work when provider APIs allow it.

### Payload and Throughput

- Minimize outbound request payloads.
- Use streaming or chunking for large uploads/downloads where supported.
- Cache low-volatility external metadata when it reduces repeated calls.

## Test and CI Performance

### Vitest

- Keep unit tests deterministic and isolate DB-dependent behavior.
- Mock expensive external integrations in unit-level tests.
- Prefer focused test execution during iteration, then expand scope before merge.

### Playwright

- Keep E2E tests data-isolated for safe parallel runs.
- Avoid brittle waits; use explicit conditions and role/text locators.
- Limit costly setup duplication across scenarios.

## Performance Review Checklist (Project-Specific)

- [ ] Is the operation/query payload minimal for the UI need?
- [ ] Are Prisma reads using `select` and bounded pagination?
- [ ] Is there any new N+1 query risk?
- [ ] Are transaction scopes short and necessary?
- [ ] Are React rerenders controlled in list and layout components?
- [ ] Did bundle size or CSS size regress after the change?
- [ ] Are external API calls bounded by timeout/retry and idempotency rules?
- [ ] Do tests remain deterministic and reasonably fast in CI?

## Verification Commands

- Baseline and lint: `npm run wasp:lint`
- Targeted tests: run only affected files under `tests/api` or `tests/e2e` first
- Build validation: `npm run wasp:build`
- DB query validation for critical paths: run `EXPLAIN ANALYZE` against changed query patterns

## Anti-Patterns to Avoid in This Repo

- Generic optimization rewrites without measurement evidence.
- Returning full Prisma model payloads to list/table UIs by default.
- Adding global caches before fixing query shape and payload size.
- Expanding entity declarations in `main.wasp` "just in case".
- Introducing heavyweight UI dependencies without checking bundle impact.