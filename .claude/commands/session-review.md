# Session Review

Review this session for durable repo learnings worth persisting.

## Triage rules

Classify each candidate insight as exactly one of:
- **instruction** — stable rule, applies repeatedly across sessions, expressible as a short constraint. Target: `CLAUDE.md` or `.github/instructions/*.instructions.md`.
- **skill** — repeatable multi-step workflow, operational runbook, or project-specific baselines with troubleshooting branches. Target: `.claude/commands/*.md` or `.github/skills/*/SKILL.md`.
- **ephemeral** — one-off incident, transient local state, stale migration quirk, unproven hypothesis. Do NOT persist.

## Anti-duplication check (mandatory before proposing)

Verify the insight is not already covered in:
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- All `.github/instructions/*.instructions.md` files
- All `.github/skills/*/SKILL.md` files

Prefer updating an existing file over creating a new one.

## Output format

Return **at most 3 items**. For each:

| Field | Value |
|---|---|
| **Label** | `instruction` / `skill` / `ephemeral` |
| **Target file** | Exact path (update preferred over create) |
| **Proposed wording** | Patch-ready text to add or replace |
| **Rationale** | One sentence — why durable and not a one-off |

If no insight clears all filters, respond: `nothing durable this session`.