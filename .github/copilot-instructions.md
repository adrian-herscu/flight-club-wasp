# Copilot Instructions for this Wasp app

## Thinking and response style
- Consider a few viable solutions first, then choose the best one.
- State concise rationale for key technical decisions.

## Source of truth
- Treat `main.wasp` (or `main.wasp.ts`) as the source of truth for app structure and Wasp declarations.
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

## Documentation preference
- Prefer Wasp docs for final behavioral confirmation:
  - https://wasp.sh/llms.txt (quick reference)
  - https://wasp.sh/llms-full.txt (comprehensive)
  - https://wasp.sh/docs (human-readable)
- When implementation details are unclear, use the fetch-wasp-docs skill or fetch-docs prompt to retrieve and search documentation
- For OpenSaaS template specifics: https://docs.opensaas.sh/llms-full.txt


## Skills
- Local skills live under `.github/skills`.
- Prefer applying the most relevant skill for making changes in that area.
- Available skills:
  - `e2e-playwright-maintenance`: `.github/skills/e2e-playwright-maintenance/SKILL.md`
  - `fetch-wasp-docs`: `.github/skills/fetch-wasp-docs/SKILL.md`
  - `pdf`: `.github/skills/pdf/SKILL.md`
  - `shadcn-component-add`: `.github/skills/shadcn-component-add/SKILL.md`
  - `wasp-db-seeding`: `.github/skills/wasp-db-seeding/SKILL.md`
  - `wasp-deployment`: `.github/skills/wasp-deployment/SKILL.md`

