-- WORKFLOW A: Manager Registration & Syllabus Discovery
-- 
-- This workflow validates that:
-- 1. A SCHOOL_MANAGER can register a school with a name, location, and currency
-- 2. The manager becomes the admin of that school
-- 3. The manager can discover system-level syllabuses (visible to all schools)
-- 4. The manager sees the school's currency is correct

-- ============================================================================
-- STEP 1: Verify school was created and linked to manager
-- ============================================================================
-- Query: Manager queries their school (would be used in manager dashboard)
-- Expected: One school row with correct admin, name, location, and currency

SELECT 
  s.id,
  s.name,
  s."addressLine1",
  s.city,
  s."stateProvince",
  s."postalCode",
  s.country,
  s.currency,
  s."adminId",
  u.email AS "admin_email",
  u.username AS "admin_username"
FROM "School" s
JOIN "User" u ON s."adminId" = u.id
WHERE s.id = 'seed-school-cloudbase-paragliding'
LIMIT 1;

-- Expected output (one row):
-- id: seed-school-cloudbase-paragliding
-- name: Cloudbase Paragliding
-- addressLine1: 123 Mountain Ridge Road
-- city: Boulder
-- stateProvince: Colorado
-- postalCode: 80301
-- country: US
-- currency: USD
-- adminId: seed-user-school-manager-01
-- admin_email: seed+school_manager.01@example.test
-- admin_username: school_manager_01

-- ============================================================================
-- STEP 2: Verify manager's account was created in the school
-- ============================================================================
-- Query: Check that an Account record exists for the manager in this school
-- Expected: One account row with USD currency and zero initial balance

SELECT 
  a.id,
  a."userId",
  a."schoolId",
  a.currency,
  a."balanceMinor",
  u.email AS "user_email"
FROM "Account" a
JOIN "User" u ON a."userId" = u.id
WHERE a."schoolId" = 'seed-school-cloudbase-paragliding'
  AND a."userId" = 'seed-user-school-manager-01'
LIMIT 1;

-- Expected output (one row):
-- id: seed-account-manager-cloudbase
-- userId: seed-user-school-manager-01
-- schoolId: seed-school-cloudbase-paragliding
-- currency: USD
-- balanceMinor: 0
-- user_email: seed+school_manager.01@example.test

-- ============================================================================
-- STEP 3: Manager discovers available system syllabuses (visible to all schools)
-- ============================================================================
-- Query: List all system-level syllabuses that are available to this school
-- Expected: Two FINAL syllabus versions: "Tandem Flights" and "Paragliding Intro"
--           Each has the latest FINAL version visible

SELECT 
  s.id AS "syllabus_id",
  s.name AS "syllabus_name",
  s."schoolId",
  sv.id AS "version_id",
  sv.version,
  sv.status,
  COUNT(sl.id) AS "lesson_count"
FROM "Syllabus" s
JOIN "SyllabusVersion" sv ON s.id = sv."syllabusId"
LEFT JOIN "SyllabusLesson" sl ON sv.id = sl."syllabusVersionId"
WHERE s."schoolId" IS NULL  -- System-level syllabuses
  AND sv.status = 'FINAL'   -- Only FINAL versions can be used for courses
GROUP BY s.id, s.name, s."schoolId", sv.id, sv.version, sv.status
ORDER BY s.name, sv.version;

-- Expected output (two rows):
-- Row 1:
--   syllabus_id: seed-syllabus-paragliding-intro
--   syllabus_name: Paragliding Intro
--   schoolId: NULL (system-level)
--   version_id: seed-syllabus-version-paragliding-intro-v1
--   version: 1
--   status: FINAL
--   lesson_count: 2
--
-- Row 2:
--   syllabus_id: seed-syllabus-tandem-flights
--   syllabus_name: Tandem Flights
--   schoolId: NULL (system-level)
--   version_id: seed-syllabus-version-tandem-flights-v1
--   version: 1
--   status: FINAL
--   lesson_count: 2

-- ============================================================================
-- STEP 4: Manager views detailed lessons for a chosen syllabus
-- ============================================================================
-- Query: Get all lessons in the "Tandem Flights" FINAL version
-- Expected: Two lessons with correct names, descriptions, and durations

SELECT 
  sl.id,
  sl.position,
  sl.name,
  sl.description,
  sl."durationMinutes"
FROM "SyllabusLesson" sl
WHERE sl."syllabusVersionId" = 'seed-syllabus-version-tandem-flights-v1'
ORDER BY sl.position;

-- Expected output (two rows):
-- Row 1:
--   id: seed-lesson-tandem-flights-01
--   position: 1
--   name: Tandem Flight Safety Briefing
--   description: Introduction to tandem flight procedures and safety protocols
--   durationMinutes: 30
--
-- Row 2:
--   id: seed-lesson-tandem-flights-02
--   position: 2
--   name: Tandem Flight Execution
--   description: Executing a tandem flight with proper techniques
--   durationMinutes: 90

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This workflow validates that:
-- ✓ School exists with correct admin, name, location, currency
-- ✓ Manager has an Account record in their school
-- ✓ System syllabuses (schoolId IS NULL) are visible to all schools
-- ✓ Only FINAL syllabus versions are available for course creation
-- ✓ Lessons are accessible and contain expected metadata
