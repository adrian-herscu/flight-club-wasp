---
applyTo: "app/main.wasp,app/schema.prisma,app/src/auth/**/*.{ts,tsx},app/src/**/*auth*.{ts,tsx}"
---

# Authentication rules (Wasp)

- Configure auth in `main.wasp` under `app.auth` and keep it aligned with `schema.prisma` `User` model.
- Prefer Wasp built-in auth forms/components for initial login/signup implementation.
- Use `useAuth` for protected UI and auth state checks.
- Treat `AuthUser.identities` fields as nullable; guard all nested access.
- Use helpers like `getEmail()` and `getUsername()` from `wasp/auth` when needed.
- Keep Wasp-managed identity fields out of `User` unless there is an explicit product need.
- If duplicating identity fields into `User` for queryability, ensure signup/update synchronization logic is implemented.
- For email auth with dummy sender, expect links in server console output.
