-- Seed a "Paragliding Intro" course for 2027 at Cloudbase Paragliding

-- ============================================================================
-- PART 1: Create a new course instance of "Paragliding Intro" syllabus
-- ============================================================================

INSERT INTO "Course" (id, "createdAt", "syllabusVersionId", "schoolId", "startDate", "minCapacity", "maxCapacity", "hourlyRate")
VALUES (
  'seed-course-paragliding-intro-2027-01',
  now(),
  'seed-syllabus-version-paragliding-intro-v1',
  'seed-school-cloudbase-paragliding',
  '2027-03-21'::timestamp,
  2,
  8,
  10000  -- $100 USD per hour (in minor units: cents)
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 2: Create course lessons for each syllabus lesson
-- ============================================================================

-- Lesson 1: Equipment Setup and Inspection
INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-intro-2027-01',
  now(),
  'seed-course-paragliding-intro-2027-01',
  'seed-lesson-paragliding-intro-01',
  'Cloudbase Training Center',
  '2027-03-21'::timestamp,
  30
)
ON CONFLICT DO NOTHING;

-- Lesson 2: Ground Handling Basics
INSERT INTO "CourseLesson" (id, "createdAt", "courseId", "syllabusLessonId", location, date, "bufferMinutes")
VALUES (
  'seed-course-lesson-intro-2027-02',
  now(),
  'seed-course-paragliding-intro-2027-01',
  'seed-lesson-paragliding-intro-02',
  'Boulder Training Site',
  '2027-03-22'::timestamp,
  30
)
ON CONFLICT DO NOTHING;
