---
agent: "agent"
description: "Diagnose and fix Wasp app errors with a structured flow."
---

Diagnose this issue in the Wasp app:
${input:problem}

Follow this sequence:
1. If `main.wasp` or `schema.prisma` changed recently, run `npm run wasp:restart` from `e2e-tests` to cleanly clear ports and restart (logs: `out/wasp-dev.log`).
2. Validate imports and operation declarations in `main.wasp`.
3. Validate entities list for each relevant operation/API.
4. Check auth config alignment (`userEntity`, methods, redirects, env vars).
5. Check migration and database connectivity state.
6. Inspect server and client error surfaces.

Output:
- Most likely root cause.
- Minimal safe fix.
- Verification steps.
