# Data Design (School / Course Domain)

## Purpose
Stable reference for the database schema, domain model, and DB-enforced invariants.
Workflow implementation planning and status tracking: see [queries/README.md](../queries/README.md).

---

## 1) Current Domain Model (Implemented)

### Core entities
- `School`
- `User` with `UserRole` (`SYSTEM_ADMIN`, `SCHOOL_MANAGER`, `INSTRUCTOR`, `STUDENT`, `USER`)
- `Instructor` (profile linked to `User`)
- `Student` (profile linked to `User`)
- `Syllabus` (school-specific or system-level; `schoolId IS NULL` = visible to all schools)
- `SyllabusPrerequisite` (prerequisite relationships between syllabuses; `isForInstructor` flag distinguishes instructor qualifications from student prerequisites)
- `SyllabusVersion` (`DRAFT`, `FINAL`, `OBSOLETE`; supports version history via self-referencing `previousVersionId`)
- `SyllabusLesson` (ordered template lesson)
- `Course` (instance of a syllabus version)
- `CourseLesson` (scheduled lesson instance; always linked to a syllabus topic, supports extra sessions)
- `AssignedInstructor` (course ↔ instructor)
- `EnrolledStudent` (course ↔ student)
- `StudentLessonEvaluation` (pass/fail + notes per student per lesson; linked to the evaluating instructor)
- `CourseInterest` (interest in a specific planned course; linked to `User`, not `Student`)
- `Account` (financial account per user per school; one account per `(userId, schoolId)` pair)
- `Transaction` (ledger entry; `DEPOSIT` or `WITHDRAWAL`; supports linked pairs for transfers, e.g., student withdrawal ↔ school deposit)
- `AuditLog` (append-only audit record; written by DB triggers on key tables)

> **Note:** `Certification` and `UserCertification` models are **not present** in the current schema. Instructor qualifications are currently modelled implicitly via completed course enrollments and passing `StudentLessonEvaluation` records, combined with `SyllabusPrerequisite` (with `isForInstructor = true`).

### Notable fields and behaviors
- `School`: `currency` (ISO 4217 code, e.g., USD, GBP, EUR), optional default hourly rate baseline (`defaultHourlyRate`, whole currency units)
- `Course`: `minCapacity`, `maxCapacity`, default hourly rate (`hourlyRate`, whole currency units).
- `CourseLesson`: required `syllabusLessonId`, optional extra-session marker (`isExtra`), `bufferMinutes`, optional lesson-level price override (`lessonPrice`, whole currency units)
- `CourseInterest.status`: `INTERESTED`, `CONTACTED`, `ENROLLED`, `CANCELLED`
- `Account.balanceMinor`: current balance in minor units (cents); `currency` matches school currency (or EUR for the system school)
- `Transaction.amountMinor`: always positive; `type` (`DEPOSIT`/`WITHDRAWAL`) determines debit/credit direction; `linkedTransactionId` cross-references the counterpart leg of a transfer

---

## 2) DB-Level Invariants Already Enforced

Implemented via constraints/relations/triggers in migrations.

1. Only `FINAL` syllabus versions can be used to create a `Course`. Enforced by a `BEFORE INSERT` trigger on `Course` that checks `SyllabusVersion.status`.
2. `SyllabusLesson` cannot be updated/deleted when its parent `SyllabusVersion` is `FINAL`. Enforced by a `BEFORE UPDATE` trigger on `SyllabusLesson`.
3. Instructor must be assigned to the course (`AssignedInstructor`) before a `StudentLessonEvaluation` can be created for that course. The trigger derives `courseId` from `CourseLesson` since `StudentLessonEvaluation` has no direct `courseId`.
4. Instructor schedule conflict prevention: A `BEFORE INSERT` trigger on `AssignedInstructor` checks whether any existing `CourseLesson` belonging to other courses the instructor is assigned to overlaps (using `SyllabusLesson.durationMinutes` + `CourseLesson.bufferMinutes`) with any lesson in the newly assigned course.
   - **Note:** The initial migration contained a broken version of this trigger (ran on `Course`, referenced non-existent `startDate`/`endDate` columns). It was corrected in the `20260309110000` migration and now runs on `AssignedInstructor`.
5. `StudentLessonEvaluation` cascades on `CourseLesson` delete.
6. Assigned/enrolled references use `onDelete: Restrict` on the instructor/student side to prevent accidental profile deletion while active links exist.
7. `CourseInterest` cascades on `Course` delete (user's interest is deleted when the course is removed).
8. **Global immutability (append-only tables):** `BEFORE UPDATE` and `BEFORE DELETE` triggers on all key domain tables (`School`, `Instructor`, `Student`, `Syllabus`, `SyllabusVersion`, `SyllabusLesson`, `SyllabusPrerequisite`, `Course`, `CourseLesson`, `StudentLessonEvaluation`, `CourseInterest`, `Account`, `Transaction`, and several SaaS tables) raise an exception unconditionally — rows can be inserted but never modified or deleted at the DB level.
9. **Audit logging:** `AFTER INSERT` triggers on `Transaction`, `AssignedInstructor`, `EnrolledStudent`, and `CourseLesson` write a row to `AuditLog`.

---

## 3) Recommended Split: App vs DB

### Use DB for
- Hard invariants and integrity (already in place with constraints/triggers)
- Immutability enforcement on all key domain tables (already in place via `prevent_row_mutation` triggers)
- Audit logging on key write events (already in place via `audit_log_row_change` triggers)
- A small set of atomic, high-contention write operations (future SP candidates)

### Use App layer for
- Business orchestration, authorization, and tenant checks
- Friendly errors and user messages
- Notifications/workflows (contacting interested students, promotion emails, etc.)

---

## 4) Notes for Implementers

- Keep Wasp operation declarations aligned with used entities.
- Keep tenant filtering explicit (`schoolId` in all manager-facing queries).
- Return friendly `HttpError` messages from actions/queries.
- Prefer app-level transactions first; introduce stored procedures only where atomicity/concurrency materially matters.
- Views: add as SQL migrations + raw query wrappers (good Prisma `5.x` support). Promote read workflows to views when the query is reused across multiple screens.
- Stack: Prisma `5.19.1`, PostgreSQL.
