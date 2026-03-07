---
applyTo: "app/main.wasp,app/src/**/*.{ts,tsx},app/schema.prisma"
---

# Advanced Wasp features and troubleshooting

- Use Jobs for background/scheduled work; prefer PostgreSQL when using PgBoss.
- Use custom HTTP APIs mainly for third-party integrations/webhooks.
- Use middleware for cross-cutting request concerns (logging, checks, transforms).
- Optimize query dependencies by declaring only relevant entities.
- Prefer pagination for large datasets.
- Use `React.memo`, `useMemo`, and `useCallback` only where re-render pressure is measurable.
- Consider optimistic UI updates only for low-failure, UX-critical actions.

## Default debug flow
- After `main.wasp`/`schema.prisma` changes, restart `wasp start` before deep debugging.
- For broken operations, verify declaration import path and entity list in `main.wasp`.
- For auth issues, verify `app.auth` config alignment with `User` model and env vars.
- For DB issues, verify migration state and `DATABASE_URL` correctness.
- Always inspect both server logs and browser console.
