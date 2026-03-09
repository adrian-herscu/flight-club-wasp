-- Seed paragliding system syllabuses and instructor qualifications for workflow validation

-- ============================================================================
-- PATCH LEGACY TRIGGERS TO MATCH CURRENT SCHEMA
-- ============================================================================

-- Course now references SyllabusVersion via syllabusVersionId.
CREATE OR REPLACE FUNCTION check_course_syllabus_version_is_final()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "SyllabusVersion" sv
    WHERE sv.id = NEW."syllabusVersionId"
      AND sv.status = 'FINAL'
  ) THEN
    RAISE EXCEPTION 'Course must use a FINAL version syllabus';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SyllabusLesson now references SyllabusVersion via syllabusVersionId.
CREATE OR REPLACE FUNCTION check_syllabus_lesson_version_not_final()
RETURNS TRIGGER AS $$
DECLARE
  v_syllabus_status "SyllabusVersionStatus";
BEGIN
  SELECT sv.status
    INTO v_syllabus_status
  FROM "SyllabusVersion" sv
  WHERE sv.id = COALESCE(NEW."syllabusVersionId", OLD."syllabusVersionId");

  IF v_syllabus_status = 'FINAL' THEN
    RAISE EXCEPTION 'Cannot modify lessons in a FINAL syllabus version';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- StudentLessonEvaluation does not have courseId; derive via CourseLesson.
CREATE OR REPLACE FUNCTION check_instructor_assigned_to_course()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id TEXT;
BEGIN
  SELECT cl."courseId"
    INTO v_course_id
  FROM "CourseLesson" cl
  WHERE cl.id = NEW."courseLessonId";

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Course lesson not found for evaluation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "AssignedInstructor" ai
    WHERE ai."courseId" = v_course_id
      AND ai."instructorId" = NEW."instructorId"
  ) THEN
    RAISE EXCEPTION 'Instructor must be assigned to the course before evaluating';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace schedule conflict trigger to run on AssignedInstructor,
-- checking overlap between lessons assigned to the same instructor.
DROP TRIGGER IF EXISTS instructor_schedule_conflict_check ON "Course";

CREATE OR REPLACE FUNCTION check_instructor_schedule_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CourseLesson" existing_cl
    JOIN "SyllabusLesson" existing_sl ON existing_sl.id = existing_cl."syllabusLessonId"
    JOIN "AssignedInstructor" existing_ai ON existing_ai."courseId" = existing_cl."courseId"
    JOIN "CourseLesson" new_cl ON new_cl."courseId" = NEW."courseId"
    JOIN "SyllabusLesson" new_sl ON new_sl.id = new_cl."syllabusLessonId"
    WHERE existing_ai."instructorId" = NEW."instructorId"
      AND existing_ai."courseId" <> NEW."courseId"
      AND existing_cl.date < new_cl.date
        + ((new_sl."durationMinutes" + COALESCE(new_cl."bufferMinutes", 0)) || ' minutes')::INTERVAL
      AND (existing_cl.date + ((existing_sl."durationMinutes" + COALESCE(existing_cl."bufferMinutes", 0)) || ' minutes')::INTERVAL)
        > new_cl.date
  ) THEN
    RAISE EXCEPTION 'Instructor has a schedule conflict with another course lesson';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instructor_schedule_conflict_check
BEFORE INSERT ON "AssignedInstructor"
FOR EACH ROW
EXECUTE FUNCTION check_instructor_schedule_conflict();

-- AuditLog.id is required (no DB default in initial migration), so ensure
-- audit trigger writes an explicit id.
CREATE OR REPLACE FUNCTION audit_log_row_change()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id TEXT;
  v_audit_id TEXT;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'Transaction' THEN v_entity_id := NEW."id"::TEXT;
    WHEN 'AssignedInstructor' THEN v_entity_id := NEW."courseId" || ':' || NEW."instructorId"::TEXT;
    WHEN 'EnrolledStudent' THEN v_entity_id := NEW."courseId" || ':' || NEW."studentId"::TEXT;
    WHEN 'CourseLesson' THEN v_entity_id := NEW."id"::TEXT;
    ELSE v_entity_id := NULL;
  END CASE;

  IF TG_OP = 'INSERT' THEN
    v_audit_id := md5(TG_TABLE_NAME || ':' || COALESCE(v_entity_id, '') || ':' || clock_timestamp()::TEXT || ':' || random()::TEXT);
    INSERT INTO "AuditLog" ("id", "entityType", "entityId")
    VALUES (v_audit_id, TG_TABLE_NAME, COALESCE(v_entity_id, 'unknown'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 1: Create system syllabuses (schoolId IS NULL = visible to all schools)
-- ============================================================================

-- Create "Tandem Flights" system syllabus
INSERT INTO "Syllabus" (id, "createdAt", name, "schoolId")
VALUES (
  'seed-syllabus-tandem-flights',
  now(),
  'Tandem Flights',
  NULL
)
ON CONFLICT (name, "schoolId") DO NOTHING;

-- Create "Paragliding Intro" system syllabus
INSERT INTO "Syllabus" (id, "createdAt", name, "schoolId")
VALUES (
  'seed-syllabus-paragliding-intro',
  now(),
  'Paragliding Intro',
  NULL
)
ON CONFLICT (name, "schoolId") DO NOTHING;

-- ============================================================================
-- PART 2: Create FINAL syllabus versions for each system syllabus
-- ============================================================================

-- Create version 1 of "Tandem Flights" (FINAL)
INSERT INTO "SyllabusVersion" (id, "createdAt", "syllabusId", version, status)
VALUES (
  'seed-syllabus-version-tandem-flights-v1',
  now(),
  'seed-syllabus-tandem-flights',
  1,
  'FINAL'
)
ON CONFLICT ("syllabusId", version) DO NOTHING;

-- Create version 1 of "Paragliding Intro" (FINAL)
INSERT INTO "SyllabusVersion" (id, "createdAt", "syllabusId", version, status)
VALUES (
  'seed-syllabus-version-paragliding-intro-v1',
  now(),
  'seed-syllabus-paragliding-intro',
  1,
  'FINAL'
)
ON CONFLICT ("syllabusId", version) DO NOTHING;

-- ============================================================================
-- PART 3: Create lessons for "Tandem Flights" syllabus
-- ============================================================================

INSERT INTO "SyllabusLesson" (id, "createdAt", "syllabusVersionId", position, name, description, "durationMinutes")
VALUES (
  'seed-lesson-tandem-flights-01',
  now(),
  'seed-syllabus-version-tandem-flights-v1',
  1,
  'Tandem Flight Safety Briefing',
  'Introduction to tandem flight procedures and safety protocols',
  30
)
ON CONFLICT ("syllabusVersionId", position) DO NOTHING;

INSERT INTO "SyllabusLesson" (id, "createdAt", "syllabusVersionId", position, name, description, "durationMinutes")
VALUES (
  'seed-lesson-tandem-flights-02',
  now(),
  'seed-syllabus-version-tandem-flights-v1',
  2,
  'Tandem Flight Execution',
  'Executing a tandem flight with proper techniques',
  90
)
ON CONFLICT ("syllabusVersionId", position) DO NOTHING;

-- ============================================================================
-- PART 4: Create lessons for "Paragliding Intro" syllabus
-- ============================================================================

INSERT INTO "SyllabusLesson" (id, "createdAt", "syllabusVersionId", position, name, description, "durationMinutes")
VALUES (
  'seed-lesson-paragliding-intro-01',
  now(),
  'seed-syllabus-version-paragliding-intro-v1',
  1,
  'Equipment Setup and Inspection',
  'Learning to set up and inspect paragliding equipment',
  45
)
ON CONFLICT ("syllabusVersionId", position) DO NOTHING;

INSERT INTO "SyllabusLesson" (id, "createdAt", "syllabusVersionId", position, name, description, "durationMinutes")
VALUES (
  'seed-lesson-paragliding-intro-02',
  now(),
  'seed-syllabus-version-paragliding-intro-v1',
  2,
  'Ground Handling Basics',
  'Learning ground handling techniques for paragliders',
  60
)
ON CONFLICT ("syllabusVersionId", position) DO NOTHING;

-- ============================================================================
-- PART 5: Create test school with USD currency
-- ============================================================================

INSERT INTO "School" (id, name, "addressLine1", "addressLine2", city, "stateProvince", "postalCode", country, currency, "adminId")
VALUES (
  'seed-school-cloudbase-paragliding',
  'Cloudbase Paragliding',
  '123 Mountain Ridge Road',
  NULL,
  'Boulder',
  'Colorado',
  '80301',
  'US',
  'USD',
  'seed-user-school-manager-01'
)
ON CONFLICT ("name", country) DO NOTHING;

-- ============================================================================
-- PART 6: Create account for school manager in test school
-- ============================================================================

INSERT INTO "Account" (id, "createdAt", "userId", "schoolId", currency, "balanceMinor")
VALUES (
  'seed-account-manager-cloudbase',
  now(),
  'seed-user-school-manager-01',
  'seed-school-cloudbase-paragliding',
  'USD',
  0
)
ON CONFLICT ("userId", "schoolId") DO NOTHING;

-- ============================================================================
-- PART 7: Establish instructor qualifications by creating completed courses
--         with passing evaluations. Each instructor qualifies for one syllabus.
-- ============================================================================

-- Create Student profiles for instructor users so their completed syllabuses
-- can represent qualification by subject.
INSERT INTO "Student" (id, "createdAt", "userId")
VALUES (
  'seed-student-profile-instructor-01',
  now(),
  'seed-user-instructor-01'
)
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "Student" (id, "createdAt", "userId")
VALUES (
  'seed-student-profile-instructor-02',
  now(),
  'seed-user-instructor-02'
)
ON CONFLICT ("userId") DO NOTHING;

-- Course 1: Instructor 01 completes "Tandem Flights" (past date)
-- This establishes that instructor_01 is qualified to teach Tandem Flights
INSERT INTO "Course" (id, "createdAt", "syllabusVersionId", "startDate", "minCapacity", "maxCapacity")
VALUES (
  'seed-course-tandem-qualification-01',
  now(),
  'seed-syllabus-version-tandem-flights-v1',
  now() - interval '60 days',
  1,
  5
)
ON CONFLICT DO NOTHING;

-- Enroll instructor_01 as student in their qualification course
INSERT INTO "EnrolledStudent" ("courseId", "studentId")
VALUES (
  'seed-course-tandem-qualification-01',
  'seed-student-profile-instructor-01'
)
ON CONFLICT DO NOTHING;

-- Create course lessons for instructor_01's qualification
INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-tandem-qual-01-1',
  now(),
  'seed-course-tandem-qualification-01',
  'seed-lesson-tandem-flights-01',
  'Boulder Training Site',
  now() - interval '60 days',
  15
)
ON CONFLICT DO NOTHING;

INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-tandem-qual-01-2',
  now(),
  'seed-course-tandem-qualification-01',
  'seed-lesson-tandem-flights-02',
  'Boulder Training Site',
  now() - interval '59 days',
  15
)
ON CONFLICT DO NOTHING;

-- Assign instructor_01 to create evaluations and mark them as passing
INSERT INTO "AssignedInstructor" ("courseId", "instructorId")
VALUES (
  'seed-course-tandem-qualification-01',
  'seed-instructor-profile-01'
)
ON CONFLICT DO NOTHING;

-- Create passing evaluations for instructor_01
INSERT INTO "StudentLessonEvaluation" (id, "createdAt", "updatedAt", "studentId", "courseLessonId", "instructorId", status, notes)
VALUES (
  'seed-eval-tandem-qual-01-1',
  now(),
  now(),
  'seed-student-profile-instructor-01',
  'seed-course-lesson-tandem-qual-01-1',
  'seed-instructor-profile-01',
  'PASS',
  'Qualified for tandem flights'
)
ON CONFLICT DO NOTHING;

INSERT INTO "StudentLessonEvaluation" (id, "createdAt", "updatedAt", "studentId", "courseLessonId", "instructorId", status, notes)
VALUES (
  'seed-eval-tandem-qual-01-2',
  now(),
  now(),
  'seed-student-profile-instructor-01',
  'seed-course-lesson-tandem-qual-01-2',
  'seed-instructor-profile-01',
  'PASS',
  'Qualified for tandem flights'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Course 2: Instructor 02 completes "Paragliding Intro" (past date)
-- This establishes that instructor_02 is qualified to teach Paragliding Intro
-- ============================================================================

INSERT INTO "Course" (id, "createdAt", "syllabusVersionId", "startDate", "minCapacity", "maxCapacity")
VALUES (
  'seed-course-intro-qualification-02',
  now(),
  'seed-syllabus-version-paragliding-intro-v1',
  now() - interval '45 days',
  1,
  5
)
ON CONFLICT DO NOTHING;

-- Enroll instructor_02 as student in their qualification course
INSERT INTO "EnrolledStudent" ("courseId", "studentId")
VALUES (
  'seed-course-intro-qualification-02',
  'seed-student-profile-instructor-02'
)
ON CONFLICT DO NOTHING;

-- Create course lessons for instructor_02's qualification
INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-intro-qual-02-1',
  now(),
  'seed-course-intro-qualification-02',
  'seed-lesson-paragliding-intro-01',
  'Boulder Training Site',
  now() - interval '45 days',
  15
)
ON CONFLICT DO NOTHING;

INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-intro-qual-02-2',
  now(),
  'seed-course-intro-qualification-02',
  'seed-lesson-paragliding-intro-02',
  'Boulder Training Site',
  now() - interval '44 days',
  15
)
ON CONFLICT DO NOTHING;

-- Assign instructor_02 to create evaluations and mark them as passing
INSERT INTO "AssignedInstructor" ("courseId", "instructorId")
VALUES (
  'seed-course-intro-qualification-02',
  'seed-instructor-profile-02'
)
ON CONFLICT DO NOTHING;

-- Create passing evaluations for instructor_02
INSERT INTO "StudentLessonEvaluation" (id, "createdAt", "updatedAt", "studentId", "courseLessonId", "instructorId", status, notes)
VALUES (
  'seed-eval-intro-qual-02-1',
  now(),
  now(),
  'seed-student-profile-instructor-02',
  'seed-course-lesson-intro-qual-02-1',
  'seed-instructor-profile-02',
  'PASS',
  'Qualified for paragliding intro'
)
ON CONFLICT DO NOTHING;

INSERT INTO "StudentLessonEvaluation" (id, "createdAt", "updatedAt", "studentId", "courseLessonId", "instructorId", status, notes)
VALUES (
  'seed-eval-intro-qual-02-2',
  now(),
  now(),
  'seed-student-profile-instructor-02',
  'seed-course-lesson-intro-qual-02-2',
  'seed-instructor-profile-02',
  'PASS',
  'Qualified for paragliding intro'
)
ON CONFLICT DO NOTHING;
