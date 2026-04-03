---
applyTo: "main.wasp,src/**/*.{ts,tsx},schema.prisma"
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
- This file owns the repo-wide Wasp restart policy; keep E2E-specific startup/reuse procedure in `.github/skills/e2e-playwright-maintenance/SKILL.md`.
- After `main.wasp` or `schema.prisma` changes, or when runtime behavior looks stale, restart the dev server using `npm run wasp:restart`; generated Wasp/Vite modules can stay stale. Logs are written to `out/wasp-dev.log`.
- Reuse a healthy already-running dev server for local E2E work instead of restarting by default; restart only when health checks fail or failures look bizarre enough to suggest stale generated state.
- For broken operations, verify declaration import path and entity list in `main.wasp`.
- If the page title loads but the app UI is blank or navbar/login/theme-switcher are missing, check the browser console for `does not provide an export named ...` errors caused by declaration import/export mismatches.
- If runtime behavior looks inconsistent right after config changes (for example app boots but routes/features are mismatched), verify `main.wasp` declarations, then clear running instances before restarting with `npm run wasp:restart`.
- For auth issues, verify `app.auth` config alignment with `User` model and env vars.
- For DB reset/seeding expectations, follow `.github/instructions/database-operations.instructions.md` and `.github/skills/wasp-db-seeding/SKILL.md`.
- Shell/CI env vars override commented `.env.server` values, so exported `SENDGRID_API_KEY` can still affect provider selection.
- Always inspect both server logs and browser console.
