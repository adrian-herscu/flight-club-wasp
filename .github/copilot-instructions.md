# Copilot Instructions for this Wasp app

## NEVER
- Start the database unless asked to do so for a specific task.
- Start the dev server unless asked to do so for a specific task.

# ALWAYS
- Prefer the vscode built in tools and configured MCP servers instead of CLI tools
- Forcefully reset the db whenever you are changing the schema or seeding, or if you encounter any unexpected issues with the db state.

## Thinking and response style
- Consider a few viable solutions first, then choose the best one.
- State concise rationale for key technical decisions.
- If a simple task becomes unexpectedly complex, consider reverting local changes and restarting from a smaller, cleaner plan; ask for approval first.


## Execution gate (plan first)
- Before implementing any code/config/test change, provide a concise step-by-step plan.
- Wait for explicit user approval (e.g., "yes" / "approved") before any state-changing action.
- State-changing actions include edits, migrations, seeding, code generation, and validating test runs that are part of implementation.
- Read-only investigation (file reads/search, documentation lookup, diagnostics that do not modify project state) may proceed before approval.
- Treat approval as explicit only when the user clearly confirms (prefer the exact token "approved").
- If scope changes during execution, stop and re-issue an updated plan for approval before continuing.
- If instructions conflict, this execution gate takes precedence for implementation actions.
- Every implementation plan must explicitly include test-first workflow steps from `## Testing workflow policy` (baseline check, failing test for behavior fixes, then fix and re-run to green).

## Source of truth
- Treat `main.wasp` as the source of truth for app structure and Wasp declarations.
- Treat `schema.prisma` as the source of truth for data models and relationships.

## Project conventions
- Use TypeScript (`.ts` / `.tsx`) for app code.
- Keep feature code grouped under `src/{featureName}`.
- Keep feature query/action implementations in `operations.ts` inside the relevant feature folder.
- In `.ts/.tsx`, import Wasp APIs from `wasp/...` (never `@wasp/...`).
- In `main.wasp`, imports of user code must use `@src/...`.
- In `.ts/.tsx`, prefer relative imports for project code under `src/`.

## Wasp operations
- Prefer Wasp queries/actions for internal client↔server communication.
- Use custom HTTP APIs primarily for external integrations (e.g., webhooks).
- Ensure every entity used in server logic is listed in the operation/API declaration in `main.wasp`.
- On the client, call actions directly with `async/await`; use `useAction` only when optimistic updates are intentionally required.

## Auth and user data
- Keep Wasp-managed auth identity fields out of the Prisma `User` model unless there is an explicit need.
- Use `AuthUser` identity helpers for nested auth identity fields.
- If auth config, `main.wasp`, or schema changes cause type/import drift, restart `wasp start`.

## Database and migrations
- Define models only in `schema.prisma`.
- After schema changes, run migrations (`wasp db migrate-dev`).
- Prefer PostgreSQL when features require it (e.g., PgBoss jobs, enums in constrained environments).

## UI / ShadCN
- ShadCN is already set up.
- Components are under `src/client/components/ui`.
- If adding new ShadCN components, ensure local `cn` utility import paths match project conventions.

## Troubleshooting defaults
- If Wasp types/imports are stale after config/schema changes, restart dev server before deep debugging.
- Check operation declarations, entity lists, path imports, server logs, and browser console.
- After any state-changing code/config/schema edit, use diagnostics integration (Problems diagnostics) and fix compilation/schema errors before finishing.

## Testing workflow policy
- Use the `runTests` tool to run tests instead of CLI commands (e.g., `npm test` or `npx playwright test`); this provides structured output, better VS Code integration, and precise error locations.
- Baseline MUST be green before any implementation change (including new features, refactors, and bug fixes): run the relevant E2E tests first.
- For new implementation (feature/additive behavior): after baseline is green, implement the change, add/update tests as needed, then re-run relevant E2E tests to green.
- For behavior fixes (correcting existing behavior): if baseline is green, add/adjust a test first to reproduce the issue (must fail), then apply the fix, then re-run to green.
- Scope by impact: for infrastructure/testing-framework changes, run the full E2E suite; otherwise prefer focused tests for the affected area first, then expand only as needed.
- For GUI/navigation changes, add or update a dedicated E2E flow that covers login and opening each visible sidebar menu item per affected user role; this flow must fail before the fix and pass after.

## Documentation preference
- Prefer Wasp docs for final behavioral confirmation:
  - https://wasp.sh/llms.txt (quick reference)
  - https://wasp.sh/llms-full.txt (comprehensive)
  - https://wasp.sh/docs (human-readable)
- When implementation details are unclear, use the fetch-wasp-docs skill or fetch-docs prompt to retrieve and search documentation
- For OpenSaaS template specifics: https://docs.opensaas.sh/llms-full.txt


## Prompts
- Reusable prompts live under `.github/prompts`.
- Invoke them by name at the start of a task or investigation.
- Available prompts:
  - `deploy-fly`: `.github/prompts/deploy-fly.prompt.md`
  - `deploy-railway`: `.github/prompts/deploy-railway.prompt.md`
  - `fetch-docs`: `.github/prompts/fetch-docs.prompt.md`
  - `session-review`: `.github/prompts/session-review.prompt.md` — end-of-session insight triage
  - `solution-selection`: `.github/prompts/solution-selection.prompt.md`
  - `troubleshoot-wasp`: `.github/prompts/troubleshoot-wasp.prompt.md`

## Skills
- Local skills live under `.github/skills`.
- Prefer applying the most relevant skill for making changes in that area.
- Available skills:
  - `e2e-playwright-maintenance`: `.github/skills/e2e-playwright-maintenance/SKILL.md`
  - `fetch-wasp-docs`: `.github/skills/fetch-wasp-docs/SKILL.md`
  - `mobile-ux-flight-club`: `.github/skills/mobile-ux-flight-club/SKILL.md`
  - `pdf`: `.github/skills/pdf/SKILL.md`
  - `shadcn-component-add`: `.github/skills/shadcn-component-add/SKILL.md`
  - `wasp-db-workflow-validation`: `.github/skills/wasp-db-workflow-validation/SKILL.md`
  - `wasp-db-seeding`: `.github/skills/wasp-db-seeding/SKILL.md`
  - `wasp-deployment`: `.github/skills/wasp-deployment/SKILL.md`

