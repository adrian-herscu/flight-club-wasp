# Course Execution State Machine

This document models the state transitions for the course execution lifecycle introduced in the
post-enrollment phase. It covers seven interlocking state machines and one financial event table:

1. [Course lifecycle](#1-course-lifecycle)
2. [Lesson scheduling lifecycle](#2-lesson-scheduling-lifecycle)
3. [Student lesson response](#3-student-lesson-response)
4. [Instructor suggestion (below capacity)](#4-instructor-suggestion-below-capacity)
5. [Instructor lesson presence](#5-instructor-lesson-presence)
6. [Student enrollment status](#6-student-enrollment-status)
7. [Refund request lifecycle](#7-refund-request-lifecycle)
8. [Financial transaction events](#8-financial-transaction-events)

The schema entities referenced in this document (`Course`, `CourseLesson`,
`StudentLessonEvaluation`, `AssignedInstructor`, `EnrolledStudent`, `Account`, `Transaction`) are
authoritative sources in `schema.prisma`. `CourseLesson` doubles as the lesson session record — its
existing `date`, `location`, `bufferMinutes`, and `syllabusLessonId` fields cover everything a
separate meeting model would need. New concepts introduced here — **MeetingAttendance**, **InstructorSuggestion**,
**InstructorLessonPresence**, and **RefundRequest** — require new schema additions to be implemented.

**Actors** (how each maps to the schema):

| Actor | Schema identity |
|---|---|
| Manager | `User` with active `UserSchoolRole.role = SCHOOL_MANAGER` for `course.schoolId`. |
| Instructor | `User` with an `Instructor` profile and an `AssignedInstructor` row for this course. |
| Lead instructor | Same as Instructor but `AssignedInstructor.isLead = true`. |
| Student | `User` with a `Student` profile and an `EnrolledStudent` row for this course. |
| System | Server-side process; no `User` actor. |

---

## Transition Tables

Columns: **From State** · **Event/Trigger** · **Actor** · **Guard** · **To State** · **Side Effects**.

### 1. Course Lifecycle

**States:** `OPEN` · `STARTED` · `COMPLETED` · `CLOSED`

> `OPEN` = no `CourseLifecycleEvent` or most-recent is `REOPENED` (existing schema). `STARTED`, `COMPLETED`, `CLOSED` require new enum values.

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| `OPEN` | **Start course** | Manager | **Hard:** (a) `assignedInstructors.count >= 1` AND (b) exactly one `AssignedInstructor` has `isLead = true` AND (c) `course.hourlyRate IS NOT NULL` AND (d) all `AssignedInstructor` rows have `agreedWagePerHour IS NOT NULL` AND (e) no prior `STARTED` `CourseLifecycleEvent` exists for this course (INV-22). **Soft (manager may override with confirmation):** (f) `enrolledStudents.count >= course.minCapacity` (`course.minCapacity` is nullable; null = no minimum enforced, soft guard always passes). | `STARTED` | Appends `STARTED` `CourseLifecycleEvent`. Course pointer is now at syllabus position 1 (no `CourseLesson` row yet = implicit `UNSCHEDULED`). **Financial:** For each enrolled student, debits the student's account and credits the school (manager) account for the full course fee (`hourlyRate × total lesson duration`). Each pair is recorded as a linked `Transaction` pair. |
| `STARTED` | **All students resolved** | System | Every `EnrolledStudent` has status `CERTIFIED` or `FAILED` (no `ACTIVE` students remain). | `COMPLETED` | Appends `COMPLETED` `CourseLifecycleEvent`. Sets any `SCHEDULED`, `BELOW_CAPACITY`, or `CONFIRMED` `CourseLesson` rows to `CANCELLED`. |
| `STARTED` | **Approve CLOSE_COURSE suggestion** | Manager | An active `InstructorSuggestion` with `CLOSE_COURSE` exists and is `PENDING`. | `CLOSED` | Marks suggestion `APPROVED`. Appends `CLOSED` `CourseLifecycleEvent`. Sets any `SCHEDULED` or `CONFIRMED` `CourseLesson` for the current lesson to `CANCELLED`. |
| `STARTED` | **Close course** (direct, no suggestion required) | Manager | Course is not already `CLOSED` or `COMPLETED`. | `CLOSED` | Appends `CLOSED` `CourseLifecycleEvent`. Sets any active `CourseLesson` for the current lesson to `CANCELLED`. |
| `OPEN` | **Close course** (direct, no suggestion required) | Manager | Course is not already `CLOSED` or `COMPLETED`. | `CLOSED` | Appends `CLOSED` `CourseLifecycleEvent`. |
| `CLOSED` | **Reopen course** | Manager | Course is `CLOSED`. | `OPEN` | Appends `REOPENED` `CourseLifecycleEvent`. Clears the active lesson pointer (requires manager to restart). |

---

### Derived concepts

> **Current lesson (course pointer):** The `SyllabusLesson` at the minimum `position` among all `SyllabusLesson` rows for `course.syllabusVersionId` for which either (a) no non-`CANCELLED` `CourseLesson` row exists for this course, or (b) a non-`CANCELLED` `CourseLesson` row exists with `status ≠ LESSON_CONCLUDED`. In other words: the lowest-position syllabus lesson that has not yet been concluded.

> **Final lesson:** The `SyllabusLesson` with the maximum `position` among all `SyllabusLesson` rows for `course.syllabusVersionId`. A `CourseLesson` is the final lesson when its `syllabusLesson.position` equals this maximum.

---

### 2. Lesson Scheduling Lifecycle

**States:** `UNSCHEDULED` (implicit — no row) · `SCHEDULED` · `BELOW_CAPACITY` · `CONFIRMED` · `LESSON_UNDERWAY` · `LESSON_CONCLUDED` · `CANCELLED`

> States stored in `CourseLesson.status`. Re-proposing updates the existing row and resets all `MeetingAttendance` to `NO_RESPONSE`.

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| `UNSCHEDULED` | **Schedule lesson** | Lead instructor | (a) Course is `STARTED`. (b) Proposed `date` range `[date, date + syllabusLesson.durationMinutes + CourseLesson.bufferMinutes]` does not overlap any other `CourseLesson` with `status` `CONFIRMED` or `LESSON_UNDERWAY` to which this instructor is assigned, across all courses. | `SCHEDULED` | Creates `CourseLesson` row with `date`, `location`, `proposedById`, `status = SCHEDULED`. Creates `NO_RESPONSE` `MeetingAttendance` records for every enrolled student. Creates `EXPECTED` `InstructorLessonPresence` record for every non-lead assigned instructor. Logs notification. |
| `SCHEDULED` | **Reschedule lesson** | Lead instructor | (a) Course is `STARTED`. (b) No schedule overlap (same guard as above). | `SCHEDULED` | Updates `CourseLesson.date`, `.location` on the existing row. Resets all `MeetingAttendance` records to `NO_RESPONSE`. Resets all `InstructorLessonPresence` records to `EXPECTED`. Supersedes any `PENDING` `InstructorSuggestion` (set to `SUPERSEDED`). Logs notification. |
| `SCHEDULED` | **Attendance check** (cron job — fires when `CourseLesson.date` is reached) | System | `CourseLesson.date` has been reached. | `CONFIRMED` (if capacity met) or `BELOW_CAPACITY` (if not) | See guards below. |
| `SCHEDULED` → *(capacity met)* | Attendance check passes | System | Accepted attendees count `>= course.minCapacity` (null = auto-pass). | `CONFIRMED` | Sets `CourseLesson.status = CONFIRMED`. Logs notification. |
| `SCHEDULED` → *(capacity not met)* | Attendance check fails | System | Accepted attendees count `< course.minCapacity` (non-null). | `BELOW_CAPACITY` | Sets `CourseLesson.status = BELOW_CAPACITY`. Logs notification. |
| `BELOW_CAPACITY` | **Submit PROCEED_WITH_PARTIAL suggestion** | Lead instructor | At least 1 student has `ACCEPTED`. | *(lesson stays `BELOW_CAPACITY`; suggestion enters `PROCEED_WITH_PARTIAL`)* | Creates `InstructorSuggestion` record. Logs notification. |
| `BELOW_CAPACITY` | **Submit CLOSE_COURSE suggestion** | Lead instructor | — | *(lesson stays `BELOW_CAPACITY`; suggestion enters `CLOSE_COURSE`)* | Creates `InstructorSuggestion` record. Logs notification. |
| `BELOW_CAPACITY` | **Reschedule lesson** | Lead instructor | No schedule overlap. | `SCHEDULED` | Updates `CourseLesson.date`, `.location`, resets `status = SCHEDULED`. Resets `MeetingAttendance` records to `NO_RESPONSE`. Resets all `InstructorLessonPresence` records to `EXPECTED`. Supersedes any `PENDING` `InstructorSuggestion`. |
| `BELOW_CAPACITY` + `PROCEED_WITH_PARTIAL` suggestion | **Manager approves suggestion** | Manager | Suggestion is `PENDING` with type `PROCEED_WITH_PARTIAL`. | `CONFIRMED` | Sets suggestion `status = APPROVED`. Sets `CourseLesson.status = CONFIRMED`. |
| `CONFIRMED` | **Reschedule lesson** (instructor unavailable) | Lead instructor | (a) Course is `STARTED`. (b) `CourseLesson.date` has not yet been reached. (c) New proposed `date` range does not overlap any other `CourseLesson` with `status` `CONFIRMED` or `LESSON_UNDERWAY` to which this instructor is assigned, across all courses. | `SCHEDULED` | Updates `CourseLesson.date`, `.location` on the existing row. Resets all `MeetingAttendance` records to `NO_RESPONSE`. Resets all `InstructorLessonPresence` records to `EXPECTED`. Logs notification to all enrolled students and all non-lead assigned instructors. |
| `CONFIRMED` | **Lesson datetime reached** (cron job) | System | Current datetime >= `CourseLesson.date`. | `LESSON_UNDERWAY` | Sets `CourseLesson.status = LESSON_UNDERWAY`. |
| `LESSON_UNDERWAY` | **Submit student assessment** | Lead instructor | Student has `EnrolledStudent.status = ACTIVE` for this course. Assessment not already submitted for this student + lesson. | *(stays `LESSON_UNDERWAY` unless all assessments done)* | Creates `StudentLessonEvaluation` with `attended` flag, `status` (`LessonEvaluationStatus`: `PASS` or `FAIL`), and optional `notes`. If `attended = false`: `status` must be `FAIL` (INV-15). If `status = FAIL`: immediately sets `EnrolledStudent.status = FAILED` — student is removed from all future lesson requirements automatically. If `status = PASS` and this was the student's final lesson: sets `EnrolledStudent.status = CERTIFIED`. |
| `LESSON_UNDERWAY` | **All assessments submitted** | System | Every `ACTIVE` enrolled student has a `StudentLessonEvaluation` for this `CourseLesson` (`FAILED` students are excluded). | `LESSON_CONCLUDED` | Sets `CourseLesson.status = LESSON_CONCLUDED`. **Financial:** For each assigned instructor (all `AssignedInstructor` rows for this course), credits that instructor's account and debits the school (manager) account for that instructor's agreed lesson wage (`AssignedInstructor.agreedWagePerHour × syllabusLesson.durationMinutes / 60`). If lessons remain: course pointer advances (next `syllabusLessonId` has no `CourseLesson` row yet = implicit `UNSCHEDULED`). If this was the final lesson: checks if all enrolled students are `CERTIFIED` or `FAILED` and triggers the Course Lifecycle completion event. |

---

### 3. Student Lesson Response

**States:** `NO_RESPONSE` · `ACCEPTED` · `DECLINED` — one `MeetingAttendance` row per (student, `CourseLesson`).

> Responses are **advisory hints** to the lead instructor — not binding commitments. Students may also ignore the proposal entirely and simply attend or not. `CourseLesson.status` is **never** changed by an individual student response; the lead instructor observes the hint distribution and decides how to act (reschedule, proceed, or escalate to the manager via a suggestion). The only hard rule is that responses lock once `CourseLesson.date` has been reached.

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| any | **Accept / re-accept** | Student | `CourseLesson` is the active lesson row. `CourseLesson.date` has not yet been reached. | `ACCEPTED` | Updates `MeetingAttendance.status`. Notifies lead instructor. |
| any | **Decline / withdraw** | Student | `CourseLesson` is the active lesson row. `CourseLesson.date` has not yet been reached. | `DECLINED` | Updates `MeetingAttendance.status`. Notifies lead instructor. |
| any | *(rescheduling by lead instructor)* | System | Lead instructor updates `CourseLesson.date`/`.location`. | *(all `MeetingAttendance` rows for this lesson reset to `NO_RESPONSE`)* | Previous responses preserved in update history but status reset. |

---

### 4. Instructor Suggestion (Below Capacity)

**States:** `NONE` (implicit) · `PROCEED_WITH_PARTIAL` · `CLOSE_COURSE` · `APPROVED` · `SUPERSEDED` — at most one active suggestion per `CourseLesson`.

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| `NONE` | **Submit PROCEED_WITH_PARTIAL** | Lead instructor | `CourseLesson.status = BELOW_CAPACITY`. ≥ 1 student `MeetingAttendance` is `ACCEPTED`. | `PROCEED_WITH_PARTIAL` | Creates `InstructorSuggestion`. Logs notification. |
| `NONE` | **Submit CLOSE_COURSE** | Lead instructor | `CourseLesson.status = BELOW_CAPACITY`. | `CLOSE_COURSE` | Creates `InstructorSuggestion`. Logs notification. |
| `PROCEED_WITH_PARTIAL` | **Manager approves** | Manager | Suggestion is `PENDING`. Course still `STARTED`. | `APPROVED` | Sets `CourseLesson.status = CONFIRMED`. |
| `CLOSE_COURSE` | **Manager approves** | Manager | Suggestion is `PENDING`. Course still `STARTED`. | `APPROVED` | Course → `CLOSED` (see Course Lifecycle). |
| `PROCEED_WITH_PARTIAL` or `CLOSE_COURSE` | **Instructor reschedules** | Lead instructor | `CourseLesson.status = BELOW_CAPACITY`. | *(suggestion `status = SUPERSEDED`)* | `CourseLesson.date`/`.location` updated, `status = SCHEDULED`, attendance reset. |

> **Note on type vs status:** `PROCEED_WITH_PARTIAL` and `CLOSE_COURSE` are values of `InstructorSuggestionType`. The row state when a suggestion is awaiting manager review is represented by `InstructorSuggestionStatus = PENDING`, which is omitted from the table above for conciseness. See the Schema Changes section for the full `InstructorSuggestion` model.

> **Suggestion withdrawal:** A lead instructor may replace a pending suggestion only by rescheduling the lesson, which supersedes it. Direct withdrawal of a pending suggestion without rescheduling is not supported.

---

### 5. Instructor Lesson Presence

**States:** `EXPECTED` · `DECLINED` · `ABSENT` — one `InstructorLessonPresence` row per (non-lead instructor, `CourseLesson`).

> Non-lead instructor responses are **advisory hints** to the lead instructor — not binding commitments. A non-lead instructor may also ignore the proposal and simply attend or not. `CourseLesson.status` is **never** changed by an individual presence indication. Responses lock once `CourseLesson.date` has been reached. `ABSENT` is a deliberate decision by the lead instructor (not auto-set by the system) and has financial consequences at `LESSON_CONCLUDED`.

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| *(row created on lesson schedule/reschedule)* | **Lesson scheduled or rescheduled** | System | — | `EXPECTED` | Creates or resets `InstructorLessonPresence` records for all non-lead assigned instructors. |
| *(no row)* | **Instructor assigned after lesson exists** | Manager | A `SCHEDULED`, `BELOW_CAPACITY`, or `CONFIRMED` active `CourseLesson` exists for the current lesson. Newly assigned instructor is not the lead (INV-21). | `EXPECTED` | Creates `InstructorLessonPresence` record for the newly assigned non-lead instructor. |
| any | **Report unavailability** | Non-lead instructor | `CourseLesson.date` has not yet been reached. | `DECLINED` | Notifies lead instructor and manager. |
| any | **Confirm availability / re-accept** | Non-lead instructor | `CourseLesson.date` has not yet been reached. | `EXPECTED` | Notifies lead instructor. |
| `DECLINED` | **Confirm absence — proceed without** | Lead instructor | `CourseLesson.date` has not yet been reached. | `ABSENT` | Notifies manager. Non-lead instructor will not be paid for this lesson at `LESSON_CONCLUDED`. |
| `DECLINED` | **Mark absent (lesson underway)** | Lead instructor | `CourseLesson.status = LESSON_UNDERWAY`. Not all assessments have been submitted yet. | `ABSENT` | Notifies manager. Non-lead instructor will not be paid for this lesson at `LESSON_CONCLUDED`. |

---

### 6. Student Enrollment Status

**States:** `ACTIVE` · `CERTIFIED` · `FAILED` (terminal) — one `EnrolledStudent` row per (student, course).

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| *(none)* | **Enroll in started course** | Manager | Course is `STARTED`. No `CourseLesson` for the first syllabus position has yet reached `LESSON_UNDERWAY` (first lesson has not started). | `ACTIVE` | Creates `EnrolledStudent` row. **Financial:** Immediately charges full course fee (same basis as course-start enrollment: `sum(syllabusLesson.durationMinutes) / 60 × course.hourlyRate`). If a `SCHEDULED`, `BELOW_CAPACITY`, or `CONFIRMED` `CourseLesson` exists for the current lesson, creates an `ACCEPTED` `MeetingAttendance` record for this student as a default hint — the student may update this before the lesson date. |
| `ACTIVE` | **Assessment submitted: PASS** | System | Student passed this lesson AND has PASS on all previous lessons AND this was the final lesson. | `CERTIFIED` | Sets `EnrolledStudent.status = CERTIFIED`. Triggers completion check on the course. |
| `ACTIVE` | **Assessment submitted: FAIL or absent** | System | Instructor submitted a FAIL evaluation (`status = FAIL`), or marked the student absent (`attended = false`, which implies FAIL). | `FAILED` | Sets `EnrolledStudent.status = FAILED`. Triggers completion check on the course. Manager and instructor are notified that this student needs a resolution decision (re-enroll elsewhere or refund). |
| `ACTIVE` or `FAILED` | *(state frozen once terminal)* | — | — | *(no transition)* | `CERTIFIED` and `FAILED` are terminal for this enrollment. To continue training, the student must be enrolled in a new course. |

---

### 7. Refund Request Lifecycle

**States:** `PENDING` · `APPROVED` · `DECLINED` — one `RefundRequest` row per request.

| From State | Event / Trigger | Actor | Guard | To State | Side Effects |
|---|---|---|---|---|---|
| *(none)* | **Submit refund request** | Student | Course is `STARTED`, `COMPLETED`, or `CLOSED`. At most one `PENDING` refund request per student per course at a time. | `PENDING` | Creates `RefundRequest` record. Notifies manager. |
| `PENDING` | **Approve refund** | Manager | A specific `amountMinor > 0` is provided AND `amountMinor <= course fee paid by student`. | `APPROVED` | Sets `RefundRequest.approvedAmountMinor`. **Financial:** Debits the school (manager) account and credits the student's account for `amountMinor`. Linked `Transaction` pair recorded. Notifies student. |
| `PENDING` | **Decline refund** | Manager | — | `DECLINED` | Optionally records a reason. Notifies student. |

---

### 8. Financial Transaction Events

This section is not a state machine but a reference table mapping business events to
`Account`/`Transaction` operations. All amounts are stored in minor currency units.
Every financial event produces a **linked pair** of `Transaction` records
(`student WITHDRAWAL ↔ school DEPOSIT`, or `school WITHDRAWAL ↔ instructor DEPOSIT`).

**Account scoping:** Accounts are per-user per-school (`Account.@@unique([userId, schoolId])`),
matching the existing schema. Each school defines its own currency; all parties operating within
that school (manager, instructors, students) use that same currency. A user who is a member of
multiple schools holds a separate account for each school, denominated in that school's currency.
All financial operations for a course use the account scoped to `course.schoolId`.

| Event | Trigger | Debit (WITHDRAWAL) | Credit (DEPOSIT) | Amount basis | Notes |
|---|---|---|---|---|---|
| **Course started** | Course transitions to `STARTED` | Student account (per enrolled student) | School (manager) account | `sum(syllabusLesson.durationMinutes) / 60 × course.hourlyRate` for all `SyllabusLesson` rows in the course's `SyllabusVersion` | One transaction pair per enrolled student. Recorded immediately when the manager fires the start action. |
| **Lesson concluded** | Meeting transitions to `LESSON_CONCLUDED` | School (manager) account | Instructor account | `syllabusLesson.durationMinutes / 60 × AssignedInstructor.agreedWagePerHour` for each instructor | One transaction pair per **attending** assigned instructor per concluded lesson. Instructors with `InstructorLessonPresence.status = ABSENT` for this lesson are excluded and receive no pay. The lead instructor is always included (no presence row). |
| **Late enrollment** | Student enrolled after course start (before first lesson starts) | Student account | School (manager) account | `sum(syllabusLesson.durationMinutes) / 60 × course.hourlyRate` (same as course-start fee) | One transaction pair per late-enrolled student. Only permitted before the first `CourseLesson` reaches `LESSON_UNDERWAY`. |
| **Refund approved** | `RefundRequest` transitions to `APPROVED` | School (manager) account | Student account | `RefundRequest.approvedAmountMinor` (manager-specified, ≤ amount originally paid) | Partial or full refund. Amount is at manager's discretion within the paid ceiling. |

> **Existing schema fit:** `Account` and `Transaction` models already exist in `schema.prisma`.
> `Account.@@unique([userId, schoolId])` already enforces one account per user per school.
> `TransactionType` already has `DEPOSIT` and `WITHDRAWAL`. No new transaction-level models are
> needed; only the new triggers and the `RefundRequest` model are additions.

> **Currency convention:** `Course.hourlyRate` and `AssignedInstructor.agreedWagePerHour` store values in **minor currency units** (e.g., pence for GBP, cents for EUR/USD). The schema comments that say "whole currency units" are incorrect and must be updated during implementation. All arithmetic in the formulas above produces minor-unit values that can be written directly to `Transaction.amountMinor` with no further conversion. Display layers divide by the currency's decimal factor (100 for most ISO 4217 currencies).

---

## Read Access Rules

Defines which data each role may read via the API. Authorization is role-scoped to `course.schoolId`.

### Active lesson (`CourseLesson.status` = `SCHEDULED`, `CONFIRMED`)

| Role | Readable fields |
|---|---|
| Student (enrolled) | `CourseLesson.date`, `.location`; own `MeetingAttendance.status`; count of `ACCEPTED` attendees. |
| Instructor (assigned) | All of the above; full `MeetingAttendance` list with per-student status. |
| Manager | All of the above; any `PENDING` `InstructorSuggestion`. |

### Concluded lesson (`CourseLesson.status` = `LESSON_CONCLUDED`)

| Role | Readable fields |
|---|---|
| Student (enrolled) | Own `StudentLessonEvaluation` (status + notes); own `EnrolledStudent.status`. |
| Instructor (assigned) | All `StudentLessonEvaluation` rows for this lesson; per-student `EnrolledStudent.status`. |
| Manager | All of the above; instructor credit transaction amount. |

### Accounts and transactions

All account data is scoped to `course.schoolId`.

| Role | Readable data |
|---|---|
| Student | Own account balance; own transaction history (charges, refunds received). |
| Instructor | Own account balance; own transaction history (lesson credits received). |
| Manager | School account balance; full school transaction history (all charges, payments, refunds). |

---

## Invariants

The following rules must be enforced at the data layer (DB constraints or server-side guards).

| ID | Invariant |
|---|---|
| INV-01 | **Hard (blocking):** course must have ≥ 1 assigned instructor, exactly one with `isLead = true`, non-null `hourlyRate`, and non-null `agreedWagePerHour` on every `AssignedInstructor` row. **Soft (manager may override):** `enrolledStudents.count >= course.minCapacity` (`course.minCapacity` is nullable; null = always passes). |
| INV-02 | The lead instructor may not schedule a lesson whose datetime range `[CourseLesson.date, CourseLesson.date + syllabusLesson.durationMinutes + CourseLesson.bufferMinutes]` overlaps any other `CourseLesson` with `status` `CONFIRMED` or `LESSON_UNDERWAY` to which that lead instructor is assigned, across all courses. (`syllabusLesson.durationMinutes` accessed via `CourseLesson.syllabusLesson`.) This guard fires at lesson **scheduling** time. No overlap check is performed at instructor **assignment** time — lesson dates are not yet known at that point. |
| INV-03 | A `StudentLessonEvaluation` may only be created by the lead instructor of the course (`AssignedInstructor.isLead = true`). |
| INV-04 | A `StudentLessonEvaluation` may only be created for a student with `EnrolledStudent.status = ACTIVE` in this course. Physical attendance is tracked implicitly by the lead instructor submitting an assessment; the student does not need to have prior `ACCEPTED` response in the system. A student with `status = FAILED` is excluded from assessment requirements in all subsequent lessons. |
| INV-05 | At most one non-`CANCELLED` `CourseLesson` may exist per `(courseId, syllabusLessonId)` pair at any time. (Note: `CourseLesson.isExtra` is a legacy field with no defined creation path in this state machine; it must not be used in new code.) |
| INV-06 | At most one `PENDING` `InstructorSuggestion` may exist per `CourseLesson` at any time. |
| INV-07 | The course pointer may only advance when the current `CourseLesson.status = LESSON_CONCLUDED`. |
| INV-08 | A course transitions to `COMPLETED` only when every `EnrolledStudent` has status `CERTIFIED` or `FAILED` (no `ACTIVE` students remain). A student set to `FAILED` mid-lesson is immediately dropped from all subsequent lesson requirements and counts toward course completion. |
| INV-09 | Student `MeetingAttendance` and non-lead instructor `InstructorLessonPresence` responses are freely toggleable in any direction regardless of `CourseLesson.status`, until `CourseLesson.date` is reached. They are advisory hints and do not change `CourseLesson.status`. All toggling is locked once `CourseLesson.date` has been reached. **Exception:** the lead instructor may still set `ABSENT` on a `DECLINED` non-lead while the lesson is `LESSON_UNDERWAY` and before all assessments have been submitted. |
| INV-10 | Assessments may not be entered until `CourseLesson.status = LESSON_UNDERWAY` (datetime reached). |
| INV-11 | Before a course is started, the system must verify that each enrolled student's `Account` scoped to `course.schoolId` has a balance `>= full course fee` in the school's currency. The manager cannot fire the start event if any student's account is insufficient. If no `Account` exists for a given student scoped to `course.schoolId`, treat the balance as 0 (blocking). The system must not auto-create accounts; the manager must ensure accounts exist and are funded before starting. |
| INV-12 | A refund amount may not exceed the total amount debited from the student for this course enrollment. |
| INV-13 | A student may have at most one `PENDING` refund request per course at any time. |
| INV-14 | Financial transactions are append-only and must not be mutated after creation. Corrections are made via compensating transactions only. |
| INV-15 | A `StudentLessonEvaluation` with `attended = false` must have `status = FAIL`. A `status = PASS` with `attended = false` is a constraint violation. |
| INV-16 | Each course must have exactly one `AssignedInstructor` with `isLead = true`. Enforced at the application layer on every create/update to `AssignedInstructor`; there is no partial unique index in Prisma. |
| INV-17 | `Course.hourlyRate` must not be null when the course is started. `School.defaultHourlyRate` provides the default; otherwise must be set explicitly at course creation. DB column should be made NOT NULL. |
| INV-18 | `AssignedInstructor.agreedWagePerHour` must be set (NOT NULL) at assignment time. A course may not be started if any assigned instructor has a null agreed wage. |
| INV-19 | A student may only be enrolled in a `STARTED` course before the first `CourseLesson` reaches `LESSON_UNDERWAY`. Enrollment is locked once the first lesson has started. |
| INV-20 | At `LESSON_CONCLUDED`, a non-lead instructor with `InstructorLessonPresence.status = ABSENT` for that lesson must not receive a pay transaction. Only the lead instructor and non-lead instructors with `EXPECTED` (or no) presence record receive payment. |
| INV-21 | When a non-lead instructor is assigned to a course that already has an active (non-`LESSON_CONCLUDED`, non-`CANCELLED`) `CourseLesson` for the current lesson, the system must immediately create an `EXPECTED` `InstructorLessonPresence` record for that instructor and that lesson. |
| INV-22 | A course may only be started once. The `OPEN → STARTED` transition is blocked if any prior `STARTED` `CourseLifecycleEvent` exists for this course. A course that has been closed and reopened (`CLOSED → OPEN`) may not be started again; it may only be closed again. Re-enrollment and re-payment for continued training requires creating a new course. |

---

## Schema Changes Required

`CourseLesson` reused as the meeting record — no new meeting model needed. Verified minimum to implement the full state machine.

### Summary

| Type | Target | Change |
|---|---|---|
| Enum values added | `CourseLifecycleStatus` | `STARTED`, `COMPLETED` |
| New enums | — | `CourseLessonStatus`, `MeetingAttendanceStatus`, `InstructorSuggestionType`, `InstructorSuggestionStatus`, `EnrolledStudentStatus`, `RefundRequestStatus` |
| Field added | `CourseLesson` | `status CourseLessonStatus`, `proposedById String?` + relation |
| Field added | `EnrolledStudent` | `status EnrolledStudentStatus` |
| Field added | `StudentLessonEvaluation` | `attended Boolean` |
| Field added | `AssignedInstructor` | `isLead Boolean`, `agreedWagePerHour Int` |
| Field changed | `Course` | `hourlyRate Int?` → `hourlyRate Int` (non-nullable) |
| Field removed | `CourseLesson` | `lessonPrice Int?` (obsolete — student fee uses `Course.hourlyRate`; instructor wage uses `AssignedInstructor.agreedWagePerHour`) |
| Back-relation added | `Instructor` | `proposedLessons`, `suggestions` |
| Back-relation added | `Student` | `meetingAttendances`, `refundRequests` |
| Back-relation added | `Course` | `refundRequests` |
| Back-relation added | `User` | `reviewedInstructorSuggestions`, `reviewedRefundRequests` |
| Back-relation added | `Transaction` | `refundDebit`, `refundCredit` |
| New model | — | `MeetingAttendance` |
| New model | — | `InstructorSuggestion` — fields: `id String`, `courseLesson CourseLesson (FK courseLessonId)`, `proposedByInstructor Instructor (FK proposedByInstructorId)`, `type InstructorSuggestionType`, `status InstructorSuggestionStatus`, `reviewedByUser User? (FK reviewedByUserId)`, `reviewedAt DateTime?`; `@@unique([courseLessonId])` enforces INV-06 at DB level |
| New model | — | `InstructorLessonPresence` (`EXPECTED` · `DECLINED` · `ABSENT`; per non-lead instructor per `CourseLesson`) |
| New model | — | `RefundRequest` — fields: `id String`, `course Course (FK courseId)`, `student Student (FK studentId)`, `status RefundRequestStatus`, `approvedAmountMinor Int?` (set on approval), `reason String?` (manager-provided on decline), `reviewedByUser User? (FK reviewedByUserId)`, `reviewedAt DateTime?`; `@@index([courseId, studentId, status])` supports INV-13 query |
| Deprecated field | `CourseLesson` | `isExtra Boolean` — legacy field with no defined creation path; must not be used in new code; to be dropped in a future migration |
| New Wasp job | `main.wasp` | `lessonStatusJob` (PgBoss, recurring cron) — drives `SCHEDULED → CONFIRMED/BELOW_CAPACITY` and `CONFIRMED → LESSON_UNDERWAY` |

---

> **Scheduling mechanism:** Both automatic transitions (`SCHEDULED → CONFIRMED/BELOW_CAPACITY` and `CONFIRMED → LESSON_UNDERWAY`) are driven by a single Wasp **PgBoss recurring job** declared in `main.wasp` with a `schedule.cron`. The job runs on the Wasp server process (no separate worker needed) and is backed by the existing PostgreSQL database — no extra infrastructure is required on Railway. The job checks all `CourseLesson` rows where `date <= now()` and whose `status` is `SCHEDULED` or `CONFIRMED`, and fires the appropriate transition.

## Open Questions

| # | Question |
|---|---|
| OQ-01 | **Weather integration (future).** When a weather forecast service is available, the system could check forecasts against `CourseLesson.date` and `CourseLesson.location` for any `SCHEDULED` or `CONFIRMED` lesson and notify the lead instructor when conditions are unsuitable. No new states or transitions are required: the lead instructor would use the existing `SCHEDULED → SCHEDULED` or `CONFIRMED → SCHEDULED` reschedule path after receiving the alert. The integration seam is: (a) a new Wasp job or webhook handler fetches forecasts, (b) it writes a notification addressed to the lead instructor, (c) the instructor acts via the existing reschedule action. Until then, weather suitability is the lead instructor's responsibility. |
