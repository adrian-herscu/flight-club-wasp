# Skill: Wasp DB Workflow Validation

Use this skill when you need to prove a business workflow at the DB level (before app/UI code) by combining deterministic seed data + SQL workflow scripts + assertions.

## Why this skill exists
This project benefits from validating flows directly in PostgreSQL first, especially for manager/instructor/student workflows and trigger-backed invariants.

## Scope and source of truth
- App structure/config: `app/main.wasp`
- Data model/enums/relations: `app/schema.prisma`
- Migration history: `app/migrations/*`
- SQL workflow checks: `app/queries/*.sql`
- Existing seeding conventions: `.github/skills/wasp-db-seeding/SKILL.md`

Never edit generated files under `app/.wasp/out/**`.

## Standard output for a new DB workflow
For each workflow request, produce:
1. **Seed migration** (deterministic + idempotent) in `app/migrations/<timestamp>_<name>/migration.sql`
2. **One SQL file per workflow** in `app/queries/`, e.g.:
   - `workflow-a-<name>.sql`
   - `workflow-b-<name>.sql`
3. **Assertions after each key step** using `SELECT` queries with expected outcomes in comments
4. **Coverage summary** in `app/queries/README.md` (or update existing section)

## Workflow-first implementation pattern
1. Define target workflow steps in business terms.
2. Map each step to exact tables/relations.
3. Seed only the minimum deterministic data needed.
4. Write SQL that executes workflow actions (INSERT/UPDATE where needed).
5. Add assertion SELECTs after every key mutation.
6. Validate end-state aggregate query (counts/status/links).

## Generic engineering patterns (reusable)

### 1) Three-layer policy enforcement
For business-critical rules, enforce at all layers:
- **UI layer**: filter/disallow invalid user choices.
- **Server layer**: reject invalid operation args/state transitions.
- **DB layer**: use constraints/triggers as final hard stop.

This prevents policy drift and protects against bypasses.

### 2) Immutable-domain editing via revisioning
When updates/deletes are constrained by triggers or audit policy:
- implement “edit” as **create next revision**,
- keep prior versions immutable,
- publish by promoting/creating a new terminal state version (e.g. `FINAL`).

### 3) Explicit status transition model
Define allowed transitions in one place (server/DB), e.g.:
- `DRAFT -> FINAL` allowed,
- `FINAL -> DRAFT` disallowed,
- edits only allowed in mutable statuses.

UI should mirror this model, not define it.

### 4) Canonical workflow read models
Prefer one canonical query per workflow intent and derive UI sections from it
(e.g. selectable/publishable/editable subsets), instead of duplicating policy logic across many queries.

### 5) Deterministic + idempotent workflow fixtures
- Prefer deterministic IDs for seeded rows.
- Always include required non-default columns in raw SQL inserts.
- Keep seeds idempotent using `ON CONFLICT DO NOTHING/UPDATE`.

### 6) Trigger compatibility safety check
Before relying on triggers in workflow scripts, confirm trigger functions match current schema fields.
Common drift patterns:
- Old field names (`syllabusId` vs `syllabusVersionId`)
- Missing derived links (`StudentLessonEvaluation` needs course via `CourseLesson`)
- Required columns in audited inserts (e.g., `AuditLog.id`)

If drift exists, patch trigger function definitions in a migration before workflow seeds.

## Minimal verification checklist
- Run: `wasp db migrate-dev`
- Confirm migration applies in shadow DB and dev DB.
- Execute each workflow SQL file.
- Verify assertions show expected rows/counts/status.
- Verify final aggregate state query per workflow.

## SQL authoring conventions
- Keep workflow files executable top-to-bottom.
- Use clear section blocks (`STEP 1`, `STEP 2`, ...).
- Keep comments focused on business intent + expected result.
- Use one instructor per course unless workflow explicitly needs multi-instructor.
- Seed historical qualification courses with past `startDate` values when proving prior completion.

## Troubleshooting quick notes
- Migration fails in shadow DB: usually trigger/schema drift, not seed logic.
- Null constraint failures during seed: missing required columns in raw SQL.
- Qualification checks returning empty: wrong student profile linked to instructor.
- Inconsistent workflow reruns: missing `ON CONFLICT` handling.
- Rule appears enforced in UI but not DB: add server + DB enforcement; UI-only checks are insufficient.
