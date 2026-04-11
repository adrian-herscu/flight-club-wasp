-- ============================================================================
-- Slice 3: Lesson Scheduling Lifecycle
-- New enums, CourseLesson status + proposedBy, EnrolledStudent status,
-- MeetingAttendance, InstructorSuggestion, InstructorLessonPresence tables.
-- ============================================================================

-- New enums

CREATE TYPE "CourseLessonStatus" AS ENUM (
  'SCHEDULED',
  'BELOW_CAPACITY',
  'CONFIRMED',
  'LESSON_UNDERWAY',
  'LESSON_CONCLUDED',
  'CANCELLED'
);

CREATE TYPE "MeetingAttendanceStatus" AS ENUM (
  'NO_RESPONSE',
  'ACCEPTED',
  'DECLINED'
);

CREATE TYPE "InstructorSuggestionType" AS ENUM (
  'PROCEED_WITH_PARTIAL',
  'CLOSE_COURSE'
);

CREATE TYPE "InstructorSuggestionStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'SUPERSEDED'
);

CREATE TYPE "InstructorLessonPresenceStatus" AS ENUM (
  'EXPECTED',
  'DECLINED',
  'ABSENT'
);

CREATE TYPE "EnrolledStudentStatus" AS ENUM (
  'ACTIVE',
  'CERTIFIED',
  'FAILED'
);

-- Drop CourseLesson UPDATE immutability trigger.
-- CourseLesson rows must be mutable for:
--   - status transitions driven by the cron job
--   - rescheduling (date / location update by lead instructor)
-- The DELETE trigger is preserved; cancelled lessons use status = CANCELLED.
DROP TRIGGER IF EXISTS prevent_update_courselesson ON "CourseLesson";

-- Add new columns to CourseLesson
ALTER TABLE "CourseLesson"
  ADD COLUMN "status"       "CourseLessonStatus",
  ADD COLUMN "proposedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;

-- Backfill: any existing CourseLesson rows (seeded legacy data) had no
-- lifecycle context; mark them CANCELLED so they don't interfere.
UPDATE "CourseLesson" SET "status" = 'CANCELLED' WHERE "status" IS NULL;

-- Make status NOT NULL now that every row has a value
ALTER TABLE "CourseLesson" ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX "CourseLesson_courseId_status_idx" ON "CourseLesson"("courseId", "status");

-- Add status column to EnrolledStudent (EnrolledStudent is NOT in the immutable list)
ALTER TABLE "EnrolledStudent"
  ADD COLUMN "status" "EnrolledStudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- ============================================================================
-- MeetingAttendance
-- One record per (student, CourseLesson). Advisory response hint.
-- ============================================================================
CREATE TABLE "MeetingAttendance" (
  "id"            TEXT          NOT NULL,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "courseLessonId" TEXT         NOT NULL,
  "studentId"     TEXT          NOT NULL,
  "status"        "MeetingAttendanceStatus" NOT NULL DEFAULT 'NO_RESPONSE',

  CONSTRAINT "MeetingAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MeetingAttendance_studentId_courseLessonId_key"
    UNIQUE ("studentId", "courseLessonId")
);

CREATE INDEX "MeetingAttendance_courseLessonId_status_idx"
  ON "MeetingAttendance"("courseLessonId", "status");
CREATE INDEX "MeetingAttendance_studentId_idx"
  ON "MeetingAttendance"("studentId");

ALTER TABLE "MeetingAttendance"
  ADD CONSTRAINT "MeetingAttendance_courseLessonId_fkey"
    FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendance"
  ADD CONSTRAINT "MeetingAttendance_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- InstructorSuggestion
-- At most one PENDING suggestion per CourseLesson (INV-06).
-- ============================================================================
CREATE TABLE "InstructorSuggestion" (
  "id"                     TEXT          NOT NULL,
  "createdAt"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "courseLessonId"         TEXT          NOT NULL,
  "proposedByInstructorId" TEXT          NOT NULL,
  "type"                   "InstructorSuggestionType"   NOT NULL,
  "status"                 "InstructorSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId"       TEXT,
  "reviewedAt"             TIMESTAMP(3),

  CONSTRAINT "InstructorSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstructorSuggestion_courseLessonId_idx"
  ON "InstructorSuggestion"("courseLessonId");

-- Partial unique index enforces INV-06: at most one PENDING suggestion per lesson.
-- Superseded/approved suggestions can coexist (and a new PENDING can be created
-- for the same lesson after the prior suggestion is resolved).
CREATE UNIQUE INDEX "InstructorSuggestion_courseLessonId_pending_uniq"
  ON "InstructorSuggestion"("courseLessonId")
  WHERE "status" = 'PENDING';

ALTER TABLE "InstructorSuggestion"
  ADD CONSTRAINT "InstructorSuggestion_courseLessonId_fkey"
    FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstructorSuggestion"
  ADD CONSTRAINT "InstructorSuggestion_proposedByInstructorId_fkey"
    FOREIGN KEY ("proposedByInstructorId") REFERENCES "Instructor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstructorSuggestion"
  ADD CONSTRAINT "InstructorSuggestion_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- InstructorLessonPresence
-- One record per (non-lead instructor, CourseLesson). Advisory presence hint.
-- ============================================================================
CREATE TABLE "InstructorLessonPresence" (
  "id"            TEXT          NOT NULL,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "courseLessonId" TEXT         NOT NULL,
  "instructorId"  TEXT          NOT NULL,
  "status"        "InstructorLessonPresenceStatus" NOT NULL DEFAULT 'EXPECTED',

  CONSTRAINT "InstructorLessonPresence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstructorLessonPresence_instructorId_courseLessonId_key"
    UNIQUE ("instructorId", "courseLessonId")
);

CREATE INDEX "InstructorLessonPresence_courseLessonId_idx"
  ON "InstructorLessonPresence"("courseLessonId");

ALTER TABLE "InstructorLessonPresence"
  ADD CONSTRAINT "InstructorLessonPresence_courseLessonId_fkey"
    FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstructorLessonPresence"
  ADD CONSTRAINT "InstructorLessonPresence_instructorId_fkey"
    FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
