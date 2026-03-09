# App Layer Planning (School / Course Domain)

## Purpose
This document summarizes the current database design decisions and defines the recommended implementation approach for the next stage (application layer in Wasp/TypeScript).

---

## 1) Current Domain Model (Implemented)

### Core entities
- `School`
- `User` with `UserRole` (`SYSTEM_ADMIN`, `SCHOOL_MANAGER`, `USER`)
- `Instructor` (profile linked to `User`)
- `Student` (profile linked to `User`)
- `Certification`, `UserCertification`
- `Syllabus` (school-specific or system-level)
- `SyllabusVersion` (`DRAFT`, `FINAL`, `OBSOLETE`)
- `SyllabusLesson` (ordered template lesson)
- `Course` (instance of syllabus version)
- `CourseLesson` (scheduled lesson instance; always linked to a syllabus topic, supports extra sessions)
- `AssignedInstructor` (course ↔ instructor)
- `EnrolledStudent` (course ↔ student)
- `StudentLessonEvaluation` (pass/fail + notes per student per lesson)
- `CourseInterest` (interest in a specific planned course before start date is set)

### Notable fields and behaviors
- `School`: `currency` (ISO 4217 code, e.g., USD, GBP, EUR) — all pricing for school uses this currency
- `Course`: `minCapacity`, `maxCapacity`, optional default lesson pricing (`defaultLessonPrice` in minor units, e.g., cents)
- `CourseLesson`: required `syllabusLessonId`, optional extra-session marker (`isExtra`), `bufferMinutes`, optional lesson-level price override (`lessonPrice` in minor units, e.g., cents)
- `CourseInterest.status`: `INTERESTED`, `CONTACTED`, `ENROLLED`, `CANCELLED`

---

## 2) DB-Level Invariants Already Enforced

Implemented via constraints/relations/triggers in migrations.

1. Only `FINAL` syllabus versions can be used to create/update `Course`.
2. `SyllabusLesson` cannot be updated/deleted when its version is `FINAL`.
3. Instructor must be assigned to the course before evaluating students.
4. Instructor schedule conflict prevention with syllabus topic duration + `bufferMinutes`.
5. `StudentLessonEvaluation` cascades on `CourseLesson` delete.
6. Assigned/enrolled references use `onDelete: Restrict` on instructor/student side to avoid accidental profile deletion with active links.
7. `CourseInterest` is linked directly to `Course` (no syllabus/school consistency trigger needed).

---

## 3) Workflow Status and App-Layer Priorities

## 3.1 Read Workflows

### A) Available syllabuses in a school (including system syllabuses)
- **Status**: Supported by schema
- **Complexity**: Medium (joins + latest FINAL version selection)
- **Recommendation**: Promote to DB **view**
- **Value**: High

### B) Course overview (capacity, enrolled count, assigned instructors, next lesson)
- **Status**: Supported by schema
- **Complexity**: Medium/High
- **Recommendation**: Promote to DB **view**
- **Value**: High

### C) Instructor schedule / conflict visibility
- **Status**: Supported by schema and conflict trigger
- **Complexity**: Medium
- **Recommendation**: Optional **view** for dashboard/listing
- **Value**: Medium-High

### D) Student progress and evaluation history
- **Status**: Supported
- **Complexity**: Medium
- **Recommendation**: Optional **view** if reused in multiple screens
- **Value**: Medium

### E) Planned-course interest queues
- **Status**: Supported (`CourseInterest`)
- **Complexity**: Low/Medium
- **Recommendation**: Optional **view** for manager UI
- **Value**: Medium

---

## 3.2 Write Workflows

### A) Course creation from syllabus version
- **Status**: DB trigger already enforces FINAL version
- **App layer**: validate business rules + friendly errors
- **Stored procedure**: Not necessary
- **Value of SP**: Low

### B) Assign instructor to course
- **Status**: Supported; schedule conflict checks enforced
- **App layer**: certification checks + user-friendly conflict messages
- **Stored procedure**: Optional only if flow becomes highly concurrent
- **Value of SP**: Medium

### C) Enroll student into course
- **Status**: Data model ready; business process still to implement
- **App layer**: check date/capacity/duplicates/interest transitions
- **Stored procedure**: **Recommended candidate** for atomicity under concurrency
- **Value of SP**: High

### D) Replace instructor in ongoing course
- **Status**: Supported by assignment model
- **App layer**: controlled replacement flow + reassignment checks
- **Stored procedure**: Optional
- **Value of SP**: Medium

### E) Add extra session for an existing syllabus topic
- **Status**: Supported (`CourseLesson` linked to `SyllabusLesson`, with `isExtra = true`)
- **App layer**: validate extra-session fields and compute topic-level outcomes from all sessions
- **Stored procedure**: Not needed
- **Value of SP**: Low

### F) Evaluation create/update policy
- **Status**: model supports writes; policy decision required
- **Business decision**: system should not allow changing past evaluations
- **App layer**: enforce immutability (and/or DB trigger to block updates/deletes after creation)
- **Stored procedure**: Optional
- **Value of SP**: Medium

### G) Waitlist and auto-promotion for full course
- **Status**: Not implemented yet (distinct from `CourseInterest`)
- **App layer**: queue semantics + notifications
- **Stored procedure**: Strong candidate if queue promotion must be atomic
- **Value of SP**: High

---

## 4) Recommended Split: App vs DB

### Use DB for
- Hard invariants and integrity (already in place with constraints/triggers)
- A small set of atomic, high-contention write operations (future SP candidates)

### Use App layer for
- Business orchestration, authorization, and tenant checks
- Friendly errors and user messages
- Notifications/workflows (contacting interested students, promotion emails, etc.)

---

## 5) Views / Stored Procedure Support with Current Stack

Current stack uses Prisma `5.19.1`.

- **Views**: good practical support as SQL migrations + app read access (commonly via raw query wrappers).
- **Stored procedures/functions**: usable, but less first-class ergonomics than Prisma model CRUD.
- **Recommendation**:
  1. Add views for reused complex reads.
  2. Add stored procedures only where atomicity/concurrency materially matters.

---

## 6) Proposed Next Milestone (App Layer)

1. Implement read query layer for:
   - available syllabuses per school
   - course overview list
   - instructor schedule board

2. Implement write actions with clear invariants:
   - assign instructor (with certification validation)
   - enroll student (capacity-aware)
   - add ad-hoc lesson
   - create evaluation with immutable-past policy

3. Decide and implement:
   - course-level waitlist model (if required now)
   - immutable evaluation enforcement location (DB trigger vs app-only)

4. Add integration tests for critical flows:
   - enrollment concurrency
   - instructor schedule conflict
   - FINAL syllabus constraints
   - ad-hoc lesson behavior

---

## 7) Notes for Implementers

- Keep Wasp operation declarations aligned with used entities.
- Keep tenant filtering explicit (`schoolId` in all manager-facing queries).
- Return friendly `HttpError` messages from actions/queries.
- Prefer app-level transactions first; introduce SP only where justified by contention and atomicity needs.
