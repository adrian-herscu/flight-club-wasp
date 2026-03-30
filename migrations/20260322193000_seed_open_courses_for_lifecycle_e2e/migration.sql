-- Seed deterministic open courses for manager lifecycle E2E coverage.
-- These courses are scoped to both managed schools of seed-user-school-manager-01
-- so the close/reopen UI is available regardless of selected school.

INSERT INTO "Course" (
  id,
  "createdAt",
  "syllabusVersionId",
  "schoolId",
  "startDate",
  "minCapacity",
  "maxCapacity",
  "hourlyRate"
)
VALUES
  (
    'seed-course-lifecycle-e2e-cloudbase',
    now(),
    'seed-syllabus-version-tandem-flights-v1',
    'seed-school-cloudbase-paragliding',
    '2027-08-01'::timestamp,
    2,
    8,
    120
  ),
  (
    'seed-course-lifecycle-e2e-annex',
    now(),
    'seed-syllabus-version-tandem-flights-v1',
    'seed-school-cloudbase-annex',
    '2027-08-02'::timestamp,
    2,
    8,
    120
  )
ON CONFLICT DO NOTHING;
