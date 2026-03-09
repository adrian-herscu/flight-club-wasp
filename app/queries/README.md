# Workflow SQL Query Coverage

This folder contains SQL scripts used to validate core DB workflows for the paragliding domain before implementing app/UI flows.

## Scope

The scripts verify two manager-facing workflows:

1. School registration + syllabus discovery
2. Course opening + instructor assignment + student enrollment

Both scripts include assertion `SELECT` statements after key operations.

---

## 1) Workflow A — School Registration & Syllabus Discovery

File: `workflow-a-school-registration.sql`

### What it covers

- **School registration state is present**
  - Confirms a school row exists with expected address/country/currency.
  - Confirms the school is linked to the intended manager (`School.adminId -> User.id`).

- **Manager account bootstrap is present**
  - Confirms manager has an `Account` record in that school with expected currency/balance.

- **System syllabus visibility model**
  - Confirms syllabuses with `Syllabus.schoolId IS NULL` are visible/usable.
  - Confirms only `FINAL` `SyllabusVersion` rows are returned for course creation.

- **Syllabus lesson drill-down**
  - Confirms lesson metadata (`position`, `name`, `durationMinutes`) is accessible for a selected final version.

### DB relationships/invariants validated

- `School.adminId -> User.id`
- `Account.(userId, schoolId)` uniqueness and school-scoped account ownership
- `Syllabus.schoolId IS NULL` for system-level/global syllabuses
- `SyllabusVersion.status = FINAL` availability filter for operational usage

---

## 2) Workflow B — Course Management

File: `workflow-b-course-management.sql`

### What it covers

- **Course creation from final syllabus version**
  - Inserts a new `Course` from a seeded `FINAL` `SyllabusVersion`.
  - Assertion verifies course points to expected syllabus/version and capacity values.

- **Instructor assignment**
  - Inserts into `AssignedInstructor` for one instructor per course.
  - Assertion verifies assignment linkage to instructor user identity.

- **Instructor qualification proof (design rule)**
  - Qualification is derived from syllabus completion, not a separate certification model.
  - Assertion checks instructor-linked student profile has `PASS` evaluations on all lessons of the syllabus.

- **Course schedule creation**
  - Inserts `CourseLesson` records linked to `SyllabusLesson` topics.
  - Assertion verifies lesson rows, dates, locations, and lesson metadata.

- **Student enrollment**
  - Inserts `EnrolledStudent` rows for two students.
  - Assertion verifies student identity linkage and enrolled roster.

- **Course aggregate state**
  - Final assertion returns one-row overview with instructor count, student count, lesson count.

### DB relationships/invariants validated

- `Course.syllabusVersionId -> SyllabusVersion.id`
- Trigger-enforced rule: course must use `FINAL` syllabus version
- `AssignedInstructor (courseId, instructorId)` composite key
- `CourseLesson.courseId -> Course.id`, `CourseLesson.syllabusLessonId -> SyllabusLesson.id`
- `EnrolledStudent (courseId, studentId)` composite key
- Qualification policy via completed/passing `StudentLessonEvaluation`

---

## Notes

- Scripts are designed to be idempotent where inserts use `ON CONFLICT`.
- Expected result comments in each file describe pass criteria for quick manual verification.
- These scripts validate DB support only; they are intentionally independent from Wasp actions/UI.
