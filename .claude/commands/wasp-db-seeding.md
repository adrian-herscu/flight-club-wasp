# Wasp DB Seeding

Add or update deterministic database seeds for this Wasp app.

$ARGUMENTS

## Scope and source of truth
- Auth config: `main.wasp`
- Data model + enums: `schema.prisma`
- Migration history: `migrations/*`
- DB reset rule: `.github/instructions/database-operations.instructions.md`
- Never edit generated files under `.wasp/out/**`.

## Current project assumptions
- PostgreSQL datasource.
- `UserRole` enum: `SYSTEM_ADMIN`, `SCHOOL_MANAGER`, `INSTRUCTOR`, `STUDENT`, `USER`.
- Wasp email auth uses `Auth`, `AuthIdentity`, `Session` tables.
- Login requires valid `AuthIdentity.providerData` JSON with `hashedPassword` and `isEmailVerified`.

## Standard seeding pattern

1. **Create deterministic data** — stable emails like `seed+role.01@example.test`, idempotent.
2. **Seed domain `User` rows first** — upsert by `email`/`username`, set role explicitly.
3. **Seed role-linked profiles** — `INSTRUCTOR` → `Instructor` row; `STUDENT` → `Student` row.
4. **Seed auth rows for login-capable users**:
   - One `Auth` row per user.
   - One `AuthIdentity` row: `providerName='email'`, `providerUserId=lower(email)`, `providerData` with hashed password and `isEmailVerified=true`.
5. **Keep migration idempotent** — use `ON CONFLICT ... DO UPDATE` / `DO NOTHING`.

## Seeded credentials (existing)
- Non-admin: `seed+user.01@example.test` / `12345678`
- Admin: `seed+system_admin.01@example.test` / `12345678`
- Instructor: `seed+instructor.01@example.test` / `12345678`

## Verification checklist
- [ ] Count seeded users (expected set present).
- [ ] Count matching `Auth` rows.
- [ ] Count matching email `AuthIdentity` rows.
- [ ] Verify all intended identities have `isEmailVerified=true`.

## Troubleshooting
- "Cannot login": `AuthIdentity` missing or malformed.
- "Email not verified": `providerData.isEmailVerified` is false/missing.
- "Duplicate key" on rerun: seeding is not idempotent — add conflict handling.
- "Migration drift" after squash: reset local DB and reapply.