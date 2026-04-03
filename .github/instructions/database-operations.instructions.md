---
applyTo: "main.wasp,schema.prisma,src/**/*.{ts,tsx}"
---

# Database, entities, queries, actions

- Define Prisma models and relations only in `schema.prisma`.
- Do not define models as entities directly in `main.wasp`.
- Treat `npm run wasp:db:reset` as the canonical local recovery step after `schema.prisma` or `migrations/*` changes; it reapplies migration-backed seeds as part of the reset.
- Keep deterministic seed design, fixture shape, and idempotency rules in `.github/skills/wasp-db-seeding/SKILL.md`; do not duplicate those conventions in feature-specific instructions.
- For lifecycle/schema transitions, apply forward-only cleanup in the same scoped change: backfill/transform existing data, enforce the new constraints, and remove fallback/legacy code paths.
- Transitional nullable/compatibility schema states must not persist beyond one scoped migration sequence unless explicitly requested.
- In `main.wasp`, each operation must declare all used entities in `entities: [...]`.
- Use `useQuery` for reads; call actions with direct `await action(args)`.
- Reserve `useAction` for explicit optimistic UI needs.
- Import Prisma enum runtime values from `@prisma/client` when comparing/assigning enum members.
- Use `HttpError` for expected failures and structured client errors.
