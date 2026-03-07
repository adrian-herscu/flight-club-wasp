---
applyTo: "app/main.wasp,app/schema.prisma,app/src/**/*.{ts,tsx}"
---

# Database, entities, queries, actions

- Define Prisma models and relations only in `schema.prisma`.
- Do not define models as entities directly in `main.wasp`.
- After schema changes, create/apply migration via `wasp db migrate-dev`.
- In `main.wasp`, each operation must declare all used entities in `entities: [...]`.
- Use `useQuery` for reads; call actions with direct `await action(args)`.
- Reserve `useAction` for explicit optimistic UI needs.
- Import Prisma enum runtime values from `@prisma/client` when comparing/assigning enum members.
- Use `HttpError` for expected failures and structured client errors.
