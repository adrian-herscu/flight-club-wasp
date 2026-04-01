---
agent: "agent"
description: "Diagnose and fix Wasp app errors with a structured flow."
---

Diagnose this issue in the Wasp app:
${input:problem}

Follow this sequence:
1. Apply the restart policy from `.github/instructions/advanced-troubleshooting.instructions.md`; when stale generated state is likely, run `npm run wasp:restart` from the repo root and inspect `out/wasp-dev.log`.
2. Validate imports and operation declarations in `main.wasp`.
3. Validate entities list for each relevant operation/API.
4. Check auth config alignment (`userEntity`, methods, redirects, env vars).
5. Check migration and database connectivity state using `.github/instructions/database-operations.instructions.md` and `.github/skills/wasp-db-seeding/SKILL.md` when reset/seed behavior matters.
6. Inspect server and client error surfaces.

Output:
- Most likely root cause.
- Minimal safe fix.
- Verification steps.
