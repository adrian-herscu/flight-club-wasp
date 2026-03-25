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
- After `main.wasp` or `schema.prisma` changes, explicitly restart the dev server using `npm run wasp:restart` inside the `e2e-tests` directory before deep debugging; generated Wasp/Vite modules can stay stale. Logs are written to `wasp-dev.log`.
- For broken operations, verify declaration import path and entity list in `main.wasp`.
- If the page title loads but the app UI is blank or navbar/login/theme-switcher are missing, check the browser console for `does not provide an export named ...` errors caused by declaration import/export mismatches.
- If runtime behavior looks inconsistent right after config changes (for example app boots but routes/features are mismatched), verify `main.wasp` declarations, and clear running instances before restarting (e.g., `cd e2e-tests && npm run wasp:restart`). Logs are written to `wasp-dev.log`.
- For auth issues, verify `app.auth` config alignment with `User` model and env vars.
- For DB issues, verify migration state and `DATABASE_URL` correctness.
- `wasp build` is production-oriented and rejects `app.emailSender` set to `Dummy`; `wasp start` allows `Dummy` for local development.
- Shell/CI env vars override commented `.env.server` values, so exported `SENDGRID_API_KEY` can still affect provider selection.
- Always inspect both server logs and browser console.
