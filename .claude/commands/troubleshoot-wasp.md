# Troubleshoot Wasp

Diagnose and fix Wasp app errors with a structured flow.

Describe the problem: $ARGUMENTS

## Diagnostic sequence

1. Apply the restart policy: when stale generated state is likely, run `npm run wasp:restart` from the repo root and inspect `out/wasp-dev.log`.
2. Validate imports and operation declarations in `main.wasp`.
3. Validate `entities: [...]` list for each relevant operation/API.
4. Check auth config alignment (`userEntity`, methods, redirects, env vars).
5. Check migration and database connectivity state; when reset/seed behavior matters, follow `.github/instructions/database-operations.instructions.md` and `.github/skills/wasp-db-seeding/SKILL.md`.
6. Inspect server logs (`out/wasp-dev.log`) and browser console.

## Output

- Most likely root cause.
- Minimal safe fix.
- Verification steps.