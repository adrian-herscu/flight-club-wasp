# Copilot Instructions for this Wasp app

## NEVER
- Start the database unless specifically asked to do so.

## ALWAYS
- Prefer the vscode built in tools and configured MCP servers instead of CLI tools.

## KNOWN ISSUES
- Sometimes the vscode built in tools are not available. In such cases, inform the developer, and use the CLI instead.
- DB reset/seeding ownership lives in `.github/instructions/database-operations.instructions.md` and `.github/skills/wasp-db-seeding/SKILL.md`.
- Wasp restart and E2E server reuse ownership lives in `.github/instructions/advanced-troubleshooting.instructions.md` and `.github/skills/e2e-playwright-maintenance/SKILL.md`.

## Thinking and response style
- Consider a few viable solutions first, then choose the best one.
- State concise rationale for key technical decisions.
- If a simple task becomes unexpectedly complex, consider reverting local changes and restarting from a smaller, cleaner plan; ask for approval first.


## Execution gate (plan first)
- Before implementing any change provide a concise step-by-step plan.
- Plans for changing user-facing features, or their tests, must consider existing `docs`, especially the `std.md` and `prd.md` files, and the execution must update them appropriately.
- Wait for explicit user approval (e.g., "yes" / "approved") before execution.
- Read-only investigation (file reads/search, documentation lookup, diagnostics that do not modify project state) may proceed before approval.
- If scope changes during execution, stop and re-issue an updated plan for approval before continuing.
- If instructions conflict, this execution gate takes precedence for implementation actions.
- Plans for changing user-facing features must explicitly include test-first workflow steps from `## Testing workflow policy` (baseline check, failing test for behavior fixes, then fix and re-run to green).
- Before execution completes, debrief.
- The debrief should be based on session introspection and list insights and lessons learned, updating instructions/skills as needed, following instructions in `session-review` prompt.


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

## Database
- Define models only in `schema.prisma`.

## UI / ShadCN
- ShadCN is already set up.
- Components are under `src/client/components/ui`.
- If adding new ShadCN components, ensure local `cn` utility import paths match project conventions.

## Troubleshooting defaults
- Check operation declarations, entity lists, path imports, server logs, and browser console.
- After any state-changing code/config/schema edit, use diagnostics integration (Problems diagnostics) and fix compilation/schema errors before finishing.

## Testing workflow policy
- After writing or editing any code, run Problems diagnostics and resolve all IDE errors before continuing.
- Before marking tests as green, confirm there are no IDE errors in the affected scope.
- Baseline MUST be green before any implementation change (including new features, refactors, and bug fixes): run `npm run wasp:lint` **and** the relevant tests first; for E2E tests, watch the `out/wasp-dev.log` file for errors and fix accordingly.
- For new implementation (feature/additive behavior): after baseline is green, implement the change, add/update tests as needed, ensure `npm run wasp:lint` passes, then re-run relevant tests to green.
- For behavior fixes (correcting existing behavior): if baseline is green, add/adjust a test first to reproduce the issue (must fail), then apply the fix, then re-run to green.
- Scope by impact: for infrastructure/testing-framework changes, run all tests; otherwise prefer focused tests for the affected area first, then expand only as needed.
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
  - `update-copilot-instructions`: `.github/prompts/update-copilot-instructions.prompt.md` — persist durable learnings into instruction files
  - `troubleshoot-wasp`: `.github/prompts/troubleshoot-wasp.prompt.md`

Only treat the prompts listed above as the active repo prompt set. Other prompt files are reference or maintenance assets unless explicitly requested.

## Skills
- Local skills live under `.github/skills`.
- Prefer applying the most relevant skill for making changes in that area.
- Only treat the following as the active repo skill set for normal work:
  - `e2e-playwright-maintenance`: `.github/skills/e2e-playwright-maintenance/SKILL.md`
  - `fetch-wasp-docs`: `.github/skills/fetch-wasp-docs/SKILL.md`
  - `mobile-ux-flight-club`: `.github/skills/mobile-ux-flight-club/SKILL.md`
  - `shadcn-component-add`: `.github/skills/shadcn-component-add/SKILL.md`
  - `wasp-db-workflow-validation`: `.github/skills/wasp-db-workflow-validation/SKILL.md`
  - `wasp-db-seeding`: `.github/skills/wasp-db-seeding/SKILL.md`
  - `wasp-deployment`: `.github/skills/wasp-deployment/SKILL.md`

Other skills in `.github/skills` are optional reference/library assets and should not override repo-specific workflows unless the task explicitly calls for them.

