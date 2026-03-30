-- Wasp Auth Tables (required by framework)
CREATE TABLE IF NOT EXISTS "Auth" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuthIdentity" (
  "providerName" TEXT,
  "providerUserId" TEXT,
  "providerData" TEXT DEFAULT '{}',
  "authId" TEXT,
  CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("providerName", "providerUserId")
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "userId" TEXT,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Domain Integrity Triggers

-- Ensure courses are only created from FINAL version syllabuses
CREATE OR REPLACE FUNCTION check_course_syllabus_version_is_final()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Syllabus"
    WHERE id = NEW."syllabusId" AND status = 'FINAL'
  ) THEN
    RAISE EXCEPTION 'Course must use a FINAL version syllabus';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_syllabus_version_check
BEFORE INSERT ON "Course"
FOR EACH ROW
EXECUTE FUNCTION check_course_syllabus_version_is_final();

-- Prevent modifications to lessons in FINAL syllabuses
CREATE OR REPLACE FUNCTION check_syllabus_lesson_version_not_final()
RETURNS TRIGGER AS $$
DECLARE
  v_syllabus_status "SyllabusVersionStatus";
BEGIN
  SELECT status INTO v_syllabus_status FROM "Syllabus" WHERE id = NEW."syllabusId";
  IF v_syllabus_status = 'FINAL' THEN
    RAISE EXCEPTION 'Cannot modify lessons in a FINAL syllabus version';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER syllabus_lesson_version_check
BEFORE UPDATE ON "SyllabusLesson"
FOR EACH ROW
EXECUTE FUNCTION check_syllabus_lesson_version_not_final();

-- Ensure instructor is assigned to course before evaluating
CREATE OR REPLACE FUNCTION check_instructor_assigned_to_course()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "AssignedInstructor"
    WHERE "courseId" = NEW."courseId" AND "instructorId" = NEW."instructorId"
  ) THEN
    RAISE EXCEPTION 'Instructor must be assigned to the course before evaluating';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instructor_course_assignment_check
BEFORE INSERT ON "StudentLessonEvaluation"
FOR EACH ROW
EXECUTE FUNCTION check_instructor_assigned_to_course();

-- Prevent instructor schedule conflicts (including buffer)
CREATE OR REPLACE FUNCTION check_instructor_schedule_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_buffer INT := 15; -- minutes buffer between lessons
BEGIN
  IF EXISTS (
    SELECT 1 FROM "AssignedInstructor" ai
    JOIN "Course" c ON c.id = ai."courseId"
    WHERE ai."instructorId" = NEW."instructorId"
      AND c.id != NEW."courseId"
      AND (
        (c."startDate" < NEW."endDate" + (v_buffer || ' minutes')::INTERVAL)
        AND (c."endDate" + (v_buffer || ' minutes')::INTERVAL > NEW."startDate")
      )
  ) THEN
    RAISE EXCEPTION 'Instructor has conflicting course assignment within % minute buffer', v_buffer;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instructor_schedule_conflict_check
BEFORE INSERT ON "Course"
FOR EACH ROW
EXECUTE FUNCTION check_instructor_schedule_conflict();

-- Audit Logging

CREATE OR REPLACE FUNCTION audit_log_row_change()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id TEXT;
BEGIN
  -- Determine entity ID based on primary key strategy
  CASE TG_TABLE_NAME
    WHEN 'Transaction' THEN v_entity_id := NEW."id"::TEXT;
    WHEN 'AssignedInstructor' THEN v_entity_id := NEW."courseId" || ':' || NEW."instructorId"::TEXT;
    WHEN 'EnrolledStudent' THEN v_entity_id := NEW."courseId" || ':' || NEW."studentId"::TEXT;
    WHEN 'CourseLesson' THEN v_entity_id := NEW."id"::TEXT;
    ELSE v_entity_id := NULL;
  END CASE;

  -- Audit only INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "AuditLog" ("entityType", "entityId")
    VALUES (TG_TABLE_NAME, v_entity_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers on key tables
CREATE TRIGGER audit_transaction_insert
AFTER INSERT ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION audit_log_row_change();

CREATE TRIGGER audit_assigned_instructor_insert
AFTER INSERT ON "AssignedInstructor"
FOR EACH ROW
EXECUTE FUNCTION audit_log_row_change();

CREATE TRIGGER audit_enrolled_student_insert
AFTER INSERT ON "EnrolledStudent"
FOR EACH ROW
EXECUTE FUNCTION audit_log_row_change();

CREATE TRIGGER audit_course_lesson_insert
AFTER INSERT ON "CourseLesson"
FOR EACH ROW
EXECUTE FUNCTION audit_log_row_change();

-- Global Immutability Enforcement

CREATE OR REPLACE FUNCTION prevent_row_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Updates and deletes are not allowed on this table (% on %)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'School', 'Instructor', 'Student', 'Syllabus', 'SyllabusVersion', 'SyllabusLesson',
    'SyllabusPrerequisite', 'Course', 'CourseLesson', 'StudentLessonEvaluation',
    'CourseInterest', 'GptResponse', 'ContactFormMessage', 'Task', 'File',
    'DailyStats', 'Account', 'Transaction'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    EXECUTE format(
      'CREATE TRIGGER prevent_update_%s BEFORE UPDATE ON "%s" FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation()',
      lower(v_table), v_table
    );
    EXECUTE format(
      'CREATE TRIGGER prevent_delete_%s BEFORE DELETE ON "%s" FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation()',
      lower(v_table), v_table
    );
  END LOOP;
END $$;
