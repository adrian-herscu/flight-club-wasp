# Skill: Wasp DB Seeding (Users, Roles, Auth)

Use this skill when adding or updating database seeds for this Wasp app, especially for role-based users that must be login-capable.

## Scope and source of truth
- App/auth config: `app/main.wasp`
- Data model + enums: `app/schema.prisma`
- Migration history: `app/migrations/*`
- Never edit generated files under `app/.wasp/out/**`.

## Current project assumptions
- PostgreSQL datasource.
- `UserRole` enum includes: `SYSTEM_ADMIN`, `SCHOOL_MANAGER`, `INSTRUCTOR`, `STUDENT`, `USER`.
- Wasp email auth uses `Auth`, `AuthIdentity`, `Session` tables.
- Login requires valid `AuthIdentity.providerData` JSON with:
  - `hashedPassword`
  - `isEmailVerified`

## Standard seeding pattern
1. **Create deterministic data**
   - Use stable emails/usernames (non-PII), e.g. `seed+role.01@example.test`.
   - Keep seeds readable and idempotent.

2. **Seed domain `User` rows first**
   - Upsert by unique natural key (`email`/`username`).
   - Set role explicitly.
   - Keep optional payment/subscription fields neutral (`NULL`/defaults) unless needed.

3. **Seed role-linked profiles**
   - `INSTRUCTOR` -> ensure `Instructor` row exists for `userId`.
   - `STUDENT` -> ensure `Student` row exists for `userId`.

4. **Seed auth rows for login-capable users**
   - Ensure one `Auth` row per seeded user.
   - Ensure one email `AuthIdentity` row:
     - `providerName = 'email'`
     - `providerUserId = lower(email)`
     - `providerData` contains hashed password and `isEmailVerified=true` when bypassing validation in local/dev seeds.

5. **Keep migration idempotent**
   - Use `ON CONFLICT ... DO UPDATE` / `DO NOTHING`.
   - Use `DO $$ ... $$` blocks when conditional flow is needed.

## Migration management rules
- Same subject => prefer one migration.
- If a migration was already applied and must be squashed locally:
  - Expect reset/reapply of local DB.
  - Do **not** rewrite applied history in shared/prod environments.
- After any schema/migration update run:
  - `wasp db migrate-dev`

## Verification checklist (required)
- Count seeded users (expected set present).
- Count matching `Auth` rows.
- Count matching email `AuthIdentity` rows.
- Verify all intended identities have `isEmailVerified=true` (if bypass intended).
- Optional: smoke login test for one seeded account.

## Troubleshooting quick notes
- "No password / cannot login": `User` exists but `AuthIdentity` missing or malformed.
- "Email not verified": `providerData.isEmailVerified` is false/missing.
- "Duplicate key" on rerun: seeding is not idempotent; add conflict handling.
- "Migration drift" after squash: reset local DB and reapply migrations.
