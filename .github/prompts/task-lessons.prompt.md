---
description: 'Propose lessons learned from a completed task for approval and patching.'
---

# Lessons Learned from This Task

You have completed a task and tests are passing. Now extract durable lessons from what you learned.

## Instructions

1. **Reflect on the task**: What failed or succeeded? What pattern or rule did you apply? What would help the next person?

2. **Triage each lesson** into exactly one category:
   - **Instruction**: A stable operational rule (e.g., "always kill existing process before restart"). Target: `.github/instructions/*.instructions.md` or `.github/copilot-instructions.md`.
   - **Skill**: A repeatable multi-step workflow (e.g., "seeding migration pattern for role-based users"). Target: `.github/skills/*/SKILL.md`.
   - **Ephemeral**: One-off incident (e.g., "PostgreSQL crashed"), transient state, or stale quirk. **Do NOT propose**.

3. **Anti-duplication** (mandatory): Search existing instruction/skill files for the lesson. If it's already covered, skip it.

4. **Target file selection**: Where does this lesson belong?
   - Wasp + Prisma operations → `.github/instructions/wasp-operations.instructions.md` (if created) or `.github/copilot-instructions.md`
   - Database seeding / role-based auth → `.github/skills/wasp-db-seeding/SKILL.md`
   - Testing workflows → `.github/skills/e2e-playwright-maintenance/SKILL.md` or `.github/instructions/project-conventions.instructions.md`
   - General patterns → relevant `.github/instructions/*.instructions.md`

5. **Propose ≤3 lessons** with:
   - **Category**: Instruction / Skill
   - **Target file**: Full path
   - **Proposed wording**: 1–2 sentences, imperative mood, actionable
   - **Rationale**: Why is this durable? (e.g., "same issue surfaced twice in different tasks", "foundational pattern used every session")

6. **Presentation**: If no durable lessons emerge, respond: "nothing durable this session — all patterns already encoded."

## Example output

| Category | Target file | Proposed wording | Rationale |
|---|---|---|---|
| Instruction | `.github/instructions/wasp-operations.instructions.md` | "After schema changes, always run `npm run wasp:db:reset` before testing to clear stale migrations." | Every schema edit this session required this step. |
| Skill | `.github/skills/wasp-db-seeding/SKILL.md` | "For multi-role registration tests, seed both the role request and the auto-generated audit record to ensure workflow determinism." | Test flakiness traced to missing audit seeding. |

---

## Approval & Application

User reviews proposed lessons and approves ≤3. For each approved lesson:
- Agent reads target file
- Applies patch (edit or append)
- Confirms change with file path + line range + exact wording applied
