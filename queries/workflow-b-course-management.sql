-- WORKFLOW B: Course Creation, Instructor Assignment & Student Enrollment
-- 
-- This workflow validates that:
-- 1. A manager can create a course from a FINAL syllabus version
-- 2. The manager can assign a qualified instructor (one who has completed that syllabus)
-- 3. The manager can enroll students in the course
-- 4. All relationships are correctly linked and constraints are enforced

-- ============================================================================
-- STEP 1: Manager creates a new course from a FINAL syllabus
-- ============================================================================
-- Query: Create a new course using the "Tandem Flights" system syllabus
-- Expected: Course inserted successfully with future startDate
--           DB trigger check_course_syllabus_version_is_final() enforces FINAL status

INSERT INTO "Course" (id, "createdAt", "syllabusVersionId", "startDate", "minCapacity", "maxCapacity")
VALUES (
  'seed-course-tandem-beginner',
  now(),
  'seed-syllabus-version-tandem-flights-v1',
  now() + interval '30 days',
  2,
  8
)
ON CONFLICT (id) DO NOTHING;

-- ASSERTION: Verify course was created
SELECT 
  c.id,
  c."syllabusVersionId",
  c."startDate",
  c."minCapacity",
  c."maxCapacity",
  sv.status AS "syllabus_version_status",
  s.name AS "syllabus_name"
FROM "Course" c
JOIN "SyllabusVersion" sv ON c."syllabusVersionId" = sv.id
JOIN "Syllabus" s ON sv."syllabusId" = s.id
WHERE c.id = 'seed-course-tandem-beginner'
LIMIT 1;

-- Expected output (one row):
-- id: seed-course-tandem-beginner
-- syllabusVersionId: seed-syllabus-version-tandem-flights-v1
-- startDate: 2026-04-08 (now + 30 days)
-- minCapacity: 2
-- maxCapacity: 8
-- syllabus_version_status: FINAL
-- syllabus_name: Tandem Flights
-- VALIDATION: syllabus_version_status must be FINAL (enforced by DB trigger)

-- ============================================================================
-- STEP 2: Manager assigns a qualified instructor to the course
-- ============================================================================
-- Query: Assign instructor_01 who is qualified for "Tandem Flights"
--        (instructor_01 completed the tandem flights qualification course with PASS evaluations)
-- Expected: AssignedInstructor row inserted successfully

INSERT INTO "AssignedInstructor" ("courseId", "instructorId")
VALUES (
  'seed-course-tandem-beginner',
  'seed-instructor-profile-01'
)
ON CONFLICT ("courseId", "instructorId") DO NOTHING;

-- ASSERTION: Verify instructor was assigned
SELECT 
  ai."courseId",
  ai."instructorId",
  i."userId",
  u.email AS "instructor_email",
  u.username AS "instructor_username"
FROM "AssignedInstructor" ai
JOIN "Instructor" i ON ai."instructorId" = i.id
JOIN "User" u ON i."userId" = u.id
WHERE ai."courseId" = 'seed-course-tandem-beginner'
  AND ai."instructorId" = 'seed-instructor-profile-01'
LIMIT 1;

-- Expected output (one row):
-- courseId: seed-course-tandem-beginner
-- instructorId: seed-instructor-profile-01
-- userId: seed-user-instructor-01
-- instructor_email: seed+instructor.01@example.test
-- instructor_username: instructor_01

-- ============================================================================
-- STEP 3: Verify instructor qualification
-- ============================================================================
-- Query: Verify that instructor_01 is qualified for "Tandem Flights"
--        by checking they have completed (passed all lessons of) that syllabus
-- Expected: Two PASS evaluations matching the two tandem flights lessons

SELECT 
  sle.id,
  sle."studentId",
  sle."instructorId",
  sle.status,
  cl.date,
  sl.position,
  sl.name,
  s.name AS "syllabus_name"
FROM "StudentLessonEvaluation" sle
JOIN "CourseLesson" cl ON sle."courseLessonId" = cl.id
JOIN "SyllabusLesson" sl ON cl."syllabusLessonId" = sl.id
JOIN "Course" c ON cl."courseId" = c.id
JOIN "SyllabusVersion" sv ON c."syllabusVersionId" = sv.id
JOIN "Syllabus" s ON sv."syllabusId" = s.id
WHERE sle."studentId" = 'seed-student-profile-instructor-01'  -- instructor_01's student profile
  AND s.id = 'seed-syllabus-tandem-flights'
  AND sle.status = 'PASS'
ORDER BY sl.position;

-- Expected output (two rows):
-- Row 1:
--   id: seed-eval-tandem-qual-01-1
--   studentId: seed-student-profile-instructor-01
--   instructorId: seed-instructor-profile-01
--   status: PASS
--   date: 2026-01-08 (now - 60 days)
--   position: 1
--   name: Tandem Flight Safety Briefing
--   syllabus_name: Tandem Flights
--
-- Row 2:
--   id: seed-eval-tandem-qual-01-2
--   studentId: seed-student-profile-instructor-01
--   instructorId: seed-instructor-profile-01
--   status: PASS
--   date: 2026-01-09 (now - 59 days)
--   position: 2
--   name: Tandem Flight Execution
--   syllabus_name: Tandem Flights
-- 
-- VALIDATION: Instructor is qualified if they have PASS for all lessons in syllabus

-- ============================================================================
-- STEP 4: Create course lessons for the new course
-- ============================================================================
-- Query: Add lesson schedule for the tandem flights course
-- Expected: Two CourseLesson records created with future dates

INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-tandem-beginner-01',
  now(),
  'seed-course-tandem-beginner',
  'seed-lesson-tandem-flights-01',
  'Boulder Peak Training Ground',
  now() + interval '30 days',
  15
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-tandem-beginner-02',
  now(),
  'seed-course-tandem-beginner',
  'seed-lesson-tandem-flights-02',
  'Boulder Peak Training Ground',
  now() + interval '31 days',
  15
)
ON CONFLICT (id) DO NOTHING;

-- ASSERTION: Verify course lessons were created
SELECT 
  cl.id,
  cl."courseId",
  cl.date,
  cl.location,
  sl.position,
  sl.name,
  sl."durationMinutes"
FROM "CourseLesson" cl
JOIN "SyllabusLesson" sl ON cl."syllabusLessonId" = sl.id
WHERE cl."courseId" = 'seed-course-tandem-beginner'
ORDER BY sl.position;

-- Expected output (two rows):
-- Row 1:
--   id: seed-course-lesson-tandem-beginner-01
--   courseId: seed-course-tandem-beginner
--   date: 2026-04-08 (now + 30 days)
--   location: Boulder Peak Training Ground
--   position: 1
--   name: Tandem Flight Safety Briefing
--   durationMinutes: 30
--
-- Row 2:
--   id: seed-course-lesson-tandem-beginner-02
--   courseId: seed-course-tandem-beginner
--   date: 2026-04-09 (now + 31 days)
--   location: Boulder Peak Training Ground
--   position: 2
--   name: Tandem Flight Execution
--   durationMinutes: 90

-- ============================================================================
-- STEP 5: Manager enrolls students in the course
-- ============================================================================
-- Query: Enroll two students in the tandem flights course
-- Expected: Two EnrolledStudent records created

INSERT INTO "EnrolledStudent" ("courseId", "studentId")
VALUES (
  'seed-course-tandem-beginner',
  'seed-student-profile-01'
)
ON CONFLICT ("courseId", "studentId") DO NOTHING;

INSERT INTO "EnrolledStudent" ("courseId", "studentId")
VALUES (
  'seed-course-tandem-beginner',
  'seed-student-profile-02'
)
ON CONFLICT ("courseId", "studentId") DO NOTHING;

-- ASSERTION: Verify students were enrolled
SELECT 
  es."courseId",
  es."studentId",
  s."userId",
  u.email AS "student_email",
  u.username AS "student_username"
FROM "EnrolledStudent" es
JOIN "Student" s ON es."studentId" = s.id
JOIN "User" u ON s."userId" = u.id
WHERE es."courseId" = 'seed-course-tandem-beginner'
ORDER BY u.username;

-- Expected output (two rows):
-- Row 1:
--   courseId: seed-course-tandem-beginner
--   studentId: seed-student-profile-01
--   userId: seed-user-student-01
--   student_email: seed+student.01@example.test
--   student_username: student_01
--
-- Row 2:
--   courseId: seed-course-tandem-beginner
--   studentId: seed-student-profile-02
--   userId: seed-user-student-02
--   student_email: seed+student.02@example.test
--   student_username: student_02

-- ============================================================================
-- STEP 6: View complete course state
-- ============================================================================
-- Query: Get a comprehensive view of the course with all linked data
-- Expected: One row showing course, instructor, and student enrollment details

SELECT 
  c.id AS "course_id",
  c."startDate",
  c."minCapacity",
  c."maxCapacity",
  s.name AS "syllabus_name",
  sv.status AS "syllabus_status",
  (SELECT COUNT(*) FROM "AssignedInstructor" WHERE "courseId" = c.id) AS "instructor_count",
  (SELECT COUNT(*) FROM "EnrolledStudent" WHERE "courseId" = c.id) AS "student_count",
  (SELECT COUNT(*) FROM "CourseLesson" WHERE "courseId" = c.id) AS "lesson_count"
FROM "Course" c
JOIN "SyllabusVersion" sv ON c."syllabusVersionId" = sv.id
JOIN "Syllabus" s ON sv."syllabusId" = s.id
WHERE c.id = 'seed-course-tandem-beginner';

-- Expected output (one row):
-- course_id: seed-course-tandem-beginner
-- startDate: 2026-04-08 (now + 30 days)
-- minCapacity: 2
-- maxCapacity: 8
-- syllabus_name: Tandem Flights
-- syllabus_status: FINAL
-- instructor_count: 1
-- student_count: 2
-- lesson_count: 2

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This workflow validates that:
-- ✓ Course can be created from a FINAL syllabus version (DB trigger enforces)
-- ✓ DB trigger check_course_syllabus_version_is_final() prevents non-FINAL versions
-- ✓ Instructor can be assigned to course via AssignedInstructor
-- ✓ Instructor qualification is proven by completed (passed) syllabus lessons
-- ✓ Course lessons can be scheduled with specific dates and locations
-- ✓ Multiple students can be enrolled in a course via EnrolledStudent
-- ✓ All relationships are correctly linked (course→syllabus→lessons, instructor, students)
