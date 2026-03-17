# Workflow Implementation Tracker

Planning and implementation status for all manager-facing workflows.
Data model and DB invariants: see [docs/data-design.md](../docs/data-design.md).

The SQL scripts in this folder validate DB-level support for workflows before app/UI implementation.
They are idempotent (`ON CONFLICT`) and intentionally independent of Wasp actions/UI.

---

## Status Overview

**SQL** = DB validation script exists · **Wasp** = operation declared in `main.wasp` · **Logic** = implemented in `operations.ts` · **UI** = page/component exists · **E2E** = end-to-end test

| #   | Workflow                               | SQL | Wasp | Logic | UI | E2E |
|-----|----------------------------------------|:---:|:----:|:-----:|:--:|:---:|
| R-A | Available syllabuses in a school       | ✅  | ✅   | ✅    | ✅ | ✅  |
| R-B | Course overview                        | ✅  | ✅   | ✅    | ✅ | ⬜  |
| R-C | Instructor schedule / conflict         | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |
| R-D | Student progress and evaluations       | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |
| R-E | Planned-course interest queues         | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |
| W-A | Course creation from syllabus version  | ✅  | ✅   | ✅    | ✅ | ⬜  |
| W-B | Assign instructor to course            | ✅  | ⬜   | ⬜    | ⬜ | ⬜  |
| W-C | Enroll student into course             | ✅  | ✅   | ✅    | ✅ | ⬜  |
| W-D | Replace instructor in ongoing course   | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |
| W-E | Add extra session for syllabus topic   | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |
| W-F | Create evaluation                      | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |
| W-G | Waitlist and auto-promotion            | ⬜  | ⬜   | ⬜    | ⬜ | ⬜  |

---

## Read Workflows

### R-A — Available syllabuses in a school

**App-layer concerns:** system syllabuses (`schoolId IS NULL`) + school-specific drafts; only `FINAL` versions available for course opening.  
**DB view candidate:** yes — high reuse value.  
**SQL validation:** `workflow-a-school-registration.sql`
- School row presence, address, currency, and `adminId → User.id` linkage
- `Account.(userId, schoolId)` uniqueness and school-scoped balance
- `Syllabus.schoolId IS NULL` visibility rule
- `SyllabusVersion.status = FINAL` filter for course creation
- Lesson metadata drill-down (`position`, `name`, `durationMinutes`)

**UI:** `ManagerSyllabusesPage` — Catalog tab shows FINAL + draft syllabuses with policy notice.  
**E2E:** `04-05-school-manager-member-approval.spec.ts` — asserts syllabus names and policy hint messages are visible.

---

### R-B — Course overview

**App-layer concerns:** enrolled count vs capacity, assigned instructor list, next scheduled lesson date.  
**DB view candidate:** yes — high reuse value.  
**SQL validation:** `workflow-b-course-management.sql`
- Course aggregate: instructor count, student count, lesson count in one row
- `Course.syllabusVersionId → SyllabusVersion.id`

**UI:** `ManagerSyllabusesPage` — Student Enrollment panel shows current enrollment count per course.

---

### R-C — Instructor schedule / conflict visibility

**App-layer concerns:** show an instructor's assigned lessons across courses with dates, durations, and buffer gaps.  
**DB view candidate:** optional — useful for a schedule board or conflict pre-check in the assignment UI.  
**SQL validation:** none yet.

---

### R-D — Student progress and evaluation history

**App-layer concerns:** per-student pass/fail history across lessons within a course.  
**DB view candidate:** optional — consider promoting if reused across student profile and course management screens.  
**SQL validation:** none yet.

---

### R-E — Planned-course interest queues

**App-layer concerns:** list users with `CourseInterest` per course grouped by `status` (`INTERESTED`, `CONTACTED`, `ENROLLED`, `CANCELLED`).  
**DB view candidate:** optional — manager UI convenience.  
**SQL validation:** none yet.

---

## Write Workflows

### W-A — Course creation from syllabus version

**App-layer concerns:** surface a friendly error when the selected version is not `FINAL`; apply capacity defaults.  
**DB invariant:** `BEFORE INSERT` trigger on `Course` enforces `SyllabusVersion.status = FINAL`.  
**SQL validation:** `workflow-b-course-management.sql` — inserts a course from a seeded FINAL version and asserts linkage.  
**UI:** `ManagerSyllabusesPage` — Details tab → "Open a Course" form (start date, min/max capacity, default lesson price).

---

### W-B — Assign instructor to course

**App-layer concerns:** validate instructor qualification via `SyllabusPrerequisite` (`isForInstructor = true`) before inserting; surface a friendly message when the DB trigger rejects due to schedule conflict.  
**DB invariant:** `BEFORE INSERT` trigger on `AssignedInstructor` checks lesson-level overlap using `SyllabusLesson.durationMinutes` + `CourseLesson.bufferMinutes`.  
**SQL validation:** `workflow-b-course-management.sql` — inserts `AssignedInstructor` and asserts linkage to instructor user identity and qualification proof via passing `StudentLessonEvaluation` records.

---

### W-C — Enroll student into course

**App-layer concerns:** capacity check, duplicate guard, `CourseInterest` status transition on enroll.  
**Stored procedure:** recommended candidate for atomicity under concurrent enrollment.  
**SQL validation:** `workflow-b-course-management.sql` — inserts `EnrolledStudent` rows for two students and asserts enrolled roster.  
**UI:** `ManagerSyllabusesPage` — Student Enrollment panel (select course + student, enroll, view roster).

---

### W-D — Replace instructor in ongoing course

**App-layer concerns:** remove old `AssignedInstructor` row, insert new one with qualification re-check; decide ownership of existing `StudentLessonEvaluation` records (they remain linked to the original instructor — immutable).  
**SQL validation:** none yet.

---

### W-E — Add extra session for syllabus topic

**App-layer concerns:** insert a `CourseLesson` with `isExtra = true` linked to an existing `SyllabusLesson`; topic-level outcome must aggregate across all sessions including extras.  
**SQL validation:** none yet.

---

### W-F — Create evaluation

**App-layer concerns:** validate student is enrolled and instructor is assigned before creating; expose no update/delete path in the API.  
**DB invariant:** `prevent_row_mutation` trigger blocks all `UPDATE`/`DELETE` on `StudentLessonEvaluation` — immutability is fully DB-enforced.  
**SQL validation:** none yet.

---

### W-G — Waitlist and auto-promotion

**App-layer concerns:** queue semantics distinct from `CourseInterest`; atomic slot reservation on capacity opening; notification on promotion.  
**Stored procedure:** strong candidate — promotion must be atomic.  
**Schema:** not yet implemented — requires new model and migration.  
**SQL validation:** none yet.
