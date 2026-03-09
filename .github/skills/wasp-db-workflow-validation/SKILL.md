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

## Project-specific rules learned from this session

### 1) System syllabus visibility
- Global syllabuses are represented by `Syllabus.schoolId IS NULL`.
- School managers should see reusable system syllabuses via this rule.

### 2) Instructor qualification model
- No separate certification model is required.
- Qualification is inferred from completed syllabus lessons:
  - Instructor-linked student profile exists
  - `StudentLessonEvaluation.status = PASS` for all lessons in target syllabus

### 3) Migration reliability in this repo
- Prefer deterministic IDs for seeded rows.
- Always include required non-default columns in raw SQL inserts.
- Keep seeds idempotent using `ON CONFLICT DO NOTHING/UPDATE`.

### 4) Trigger compatibility safety check
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
