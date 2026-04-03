---
applyTo: "main.wasp,schema.prisma,src/**/*.{ts,tsx},src/**/*.css"
---

# Project conventions (Wasp)

- Keep app configuration in `main.wasp`.
- Keep DB models in `schema.prisma`.
- Group declarations in `main.wasp` by feature using `// #region` blocks.
- Group implementation code by feature directory in `src/`.
- Keep queries/actions in each feature's `operations.ts`.
- Use `wasp/...` imports in `.ts/.tsx` files.
- Use `@src/...` imports only in `main.wasp` declarations.
- In `main.wasp`, ensure declaration imports align with component exports; mismatches can cause runtime blank pages.
- Use relative imports for non-Wasp source imports inside `.ts/.tsx`.
- Ensure the root app component renders `<Outlet />` for nested routes.
- Prefer single-path implementations: do not keep old and new behavior branches in parallel unless explicitly requested.
- Remove dead code, compatibility shims, and legacy route/query-param shortcuts in the same feature/fix PR.
- The execution gate in `.github/copilot-instructions.md` (`## Execution gate (plan first)`) is mandatory for all state-changing implementation actions.
- Follow testing workflow policy from `.github/copilot-instructions.md` (`## Testing workflow policy`).
- For implementation tasks, plans must explicitly start with relevant baseline tests, then use a failing test for behavior fixes before code changes, then re-run to green.
