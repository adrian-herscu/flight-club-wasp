---
applyTo: "app/main.wasp,app/schema.prisma,app/src/**/*.{ts,tsx},app/src/**/*.css"
---

# Project conventions (Wasp)

- Keep app configuration in `main.wasp` / `main.wasp.ts`.
- Keep DB models in `schema.prisma`.
- Group declarations in `main.wasp` by feature using `// #region` blocks.
- Group implementation code by feature directory in `src/`.
- Keep queries/actions in each feature's `operations.ts`.
- Use `wasp/...` imports in `.ts/.tsx` files.
- Use `@src/...` imports only in `main.wasp` declarations.
- In `main.wasp.ts`, use `importDefault` for default exports and `import` for named exports; mismatches can cause runtime blank pages.
- Use relative imports for non-Wasp source imports inside `.ts/.tsx`.
- Ensure the root app component renders `<Outlet />` for nested routes.
