# Wasp DB Workflow Validation

Prove a business workflow at the DB level using deterministic seeds + SQL scripts + assertions.

$ARGUMENTS

## Scope and source of truth
- App structure: `main.wasp`
- Data model/enums: `schema.prisma`
- Migration history: `migrations/*`
- SQL workflow checks: `queries/*.sql`
- DB reset rule: `.github/instructions/database-operations.instructions.md`
- Seeding conventions: `.github/skills/wasp-db-seeding/SKILL.md`

Never edit generated files under `.wasp/out/**`.

## Standard output for a new DB workflow

1. **Seed migration** (deterministic + idempotent) in `migrations/<timestamp>_<name>/migration.sql`
2. **One SQL file per workflow** in `queries/`, e.g. `workflow-a-<name>.sql`
3. **Assertions after each key step** using `SELECT` queries with expected outcomes in comments
4. **Coverage summary** update in `queries/README.md`

## Workflow-first implementation pattern

1. Define target workflow steps in business terms.
2. Map each step to exact tables/relations.
3. Seed only the minimum deterministic data needed.
4. Write SQL that executes workflow actions (INSERT/UPDATE).
5. Add assertion SELECTs after every key mutation.
6. Validate end-state aggregate query (counts/status/links).

## Engineering patterns

- **Three-layer policy enforcement**: UI → Server → DB constraints/triggers.
- **Immutable-domain editing**: implement "edit" as create-next-revision; keep prior versions immutable.
- **Explicit status transitions**: define allowed transitions in one place (server/DB); UI mirrors, not defines.
- **Canonical workflow read models**: one canonical query per workflow intent; derive UI subsets from it.
- **Deterministic + idempotent fixtures**: `ON CONFLICT DO NOTHING/UPDATE`.

## Minimal verification checklist
- [ ] Apply the repo DB reset rule.
- [ ] Confirm migration applies in shadow DB and dev DB.
- [ ] Execute each workflow SQL file.
- [ ] Verify assertions show expected rows/counts/status.
- [ ] Verify final aggregate state query per workflow.