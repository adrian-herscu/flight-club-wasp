# Claude Code Instructions for Flight Club (Wasp App)

## NEVER
- Start the database unless specifically asked to do so.
- Edit generated files under `.wasp/out/**`.
- Import Wasp APIs from `@wasp/...` — always use `wasp/...` in `.ts/.tsx` files.

## ALWAYS
- Use the dedicated tools (Read, Edit, Grep, Glob) instead of shell equivalents.
- Run `npm run wasp:lint` and resolve all IDE errors before marking work done.
- After any state-changing code/config/schema edit, check Problems diagnostics and fix errors.

## Thinking and response style
- Consider 2–4 viable solutions first, then choose the best one.
- State concise rationale for key technical decisions.
- If a simple task becomes unexpectedly complex, consider reverting and restarting from a smaller plan — ask for approval first.

## Execution gate (plan first)
- Before implementing any change, provide a concise step-by-step plan.
- Plans for user-facing features must consider `docs/std.md` and `docs/prd.md` and update them after execution.
- Wait for explicit user approval (`"yes"` / `"approved"`) before executing.
- Read-only investigation (file reads, search, diagnostics) may proceed before approval.
- If scope changes during execution, stop and re-issue an updated plan before continuing.
- Plans for behavior fixes must include test-first steps: failing test → fix → green.
- Before finishing, run a debrief: list insights and lessons learned; update instructions/skills as needed (see `/session-review`).

## Source of truth
- `main.wasp` — app structure and Wasp declarations.
- `schema.prisma` — data models and relationships.

## Project conventions
- Forward-only posture: delete obsolete code, flags, and queries in the same change that introduces the replacement.
- No URL-based hidden setup contracts (e.g., query-param preselection) unless explicitly requested.
- Use TypeScript (`.ts` / `.tsx`) for all app code.
- Feature code lives under `src/{featureName}`.
- Query/action implementations go in `src/{featureName}/operations.ts`.
- Imports in `.ts/.tsx`: use `wasp/...` for Wasp APIs, relative paths for project code.
- Imports in `main.wasp`: use `@src/...` for user code.
- Group declarations in `main.wasp` by feature using `// #region` blocks.
- Ensure `<Outlet />` renders in the root app component for nested routes.
- Remove dead code, compatibility shims, and legacy routes in the same PR.

## Wasp operations
- Prefer Wasp queries/actions for client↔server communication.
- Custom HTTP APIs are for external integrations (webhooks) only.
- Every entity used in server logic must be listed in `entities: [...]` in `main.wasp`.
- On the client: call actions with `async/await`; use `useAction` only for intentional optimistic updates.
- Use `useQuery` for reads.
- Import Prisma enum runtime values from `@prisma/client`.
- Use `HttpError` for expected failures and structured client errors.

## Auth and user data
- Keep Wasp-managed identity fields out of the Prisma `User` model unless explicitly needed.
- Use `AuthUser` identity helpers for nested auth identity fields.
- Treat `AuthUser.identities` fields as nullable; guard all nested access.
- Use `getEmail()` and `getUsername()` from `wasp/auth` when needed.
- Configure auth in `main.wasp` under `app.auth`, aligned with `schema.prisma` `User` model.
- For email auth with dummy sender, expect links in server console output.

## Database
- Define models only in `schema.prisma` — not in `main.wasp`.
- `npm run wasp:db:reset` is the canonical local recovery step after schema or migration changes.
- For lifecycle/schema transitions: backfill, enforce new constraints, and remove legacy code in one scoped change.
- Transitional nullable/compatibility states must not persist beyond one migration sequence unless approved.

## UI / ShadCN
- ShadCN is already initialized; components live under `src/client/components/ui`.
- Tailwind v4 is NOT supported — stay on the current version.
- Adjust generated utility import paths to match local project layout.
- Page-level `.tsx` files outside `src/client/components/patterns/` and `src/client/components/ui/` must NOT contain raw HTML elements (`div`, `span`, `p`, etc.) or `className` props directly. Move all HTML structure and Tailwind into named primitive components under `src/client/components/patterns/`.
- After any UI change, run `npm run wasp:lint` to verify the UI boundary (`scripts/enforce-ui-boundary.mjs`).

## Testing workflow policy
- **Baseline must be green** before any implementation: run `npm run wasp:lint` and relevant tests first.
- For E2E tests, watch `out/wasp-dev.log` for errors.
- **New features**: implement → add/update tests → lint → green.
- **Bug fixes**: add a failing test first → apply fix → re-run to green.
- Run all tests for infrastructure/framework changes; prefer focused tests for feature changes.
- For GUI/navigation changes, add/update an E2E flow covering login and each sidebar menu item per affected role.

## Troubleshooting defaults
- Check operation declarations, entity lists, path imports, server logs, and browser console.
- After `main.wasp` or `schema.prisma` changes (or stale behavior), restart with `npm run wasp:restart`; logs go to `out/wasp-dev.log`.
- Reuse a healthy running dev server for local E2E; restart only when health checks fail.
- For blank/broken UI: check browser console for `does not provide an export named` errors → declaration import mismatch in `main.wasp`.
- Shell/CI env vars override commented `.env.server` values.
- Always inspect both server logs and browser console.

## Documentation preference
- Prefer Wasp docs for behavioral confirmation:
  - Quick reference: `https://wasp.sh/llms.txt`
  - Comprehensive: `https://wasp.sh/llms-full.txt`
  - Human-readable: `https://wasp.sh/docs`
- For OpenSaaS specifics: `https://docs.opensaas.sh/llms-full.txt`
- When implementation details are unclear, use the `/fetch-wasp-docs` command.

## Mobile UX (Flight Club)
- Design every critical flow mobile-first (375–430px).
- Decision matrix: use `Tabs` for 2–5 peer sections; `Submenu` for >5 child screens; `Sheet`/`Drawer` for secondary/temporary tasks.
- Persist active section, search, filters, sort, and pagination in the URL.
- Prefer path-based URLs for major sections (e.g., `/admin/syllabuses/catalog`); query params for secondary UI state.
- Section switcher should be a sticky top toolbar with immediate visual feedback.
- Touch targets: 48×48px ideal (min 44×44px).
- If a page has >4 major vertical sections on mobile, refactor into tabs/submenu or step flow.

---

## Available Commands (Skills)

Use these with `/command-name` in Claude Code:

| Command | Purpose |
|---|---|
| `/fetch-wasp-docs` | Fetch authoritative Wasp documentation |
| `/troubleshoot-wasp` | Structured Wasp error diagnosis |
| `/solution-selection` | Generate and compare implementation options |
| `/session-review` | End-of-session insight triage |
| `/wasp-db-seeding` | Add/update deterministic database seeds |
| `/wasp-db-workflow-validation` | Validate business workflows at the DB level |
| `/wasp-deployment` | Deploy to Railway |
| `/e2e-playwright-maintenance` | Run/fix local Playwright E2E tests |
| `/shadcn-component-add` | Add a ShadCN component |
| `/mobile-ux` | Mobile UX guidance for Flight Club |

Skill details live in `.github/skills/*/SKILL.md`.
Prompt details live in `.github/prompts/*.prompt.md`.