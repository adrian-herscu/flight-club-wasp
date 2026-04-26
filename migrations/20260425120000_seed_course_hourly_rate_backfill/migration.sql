-- Ensure seeded Cloudbase school and seeded courses have deterministic hourly pricing.
-- This migration is idempotent and only targets seed fixtures.

UPDATE "School"
SET "defaultHourlyRate" = 150
WHERE id = 'seed-school-cloudbase-paragliding'
  AND ("defaultHourlyRate" IS NULL OR "defaultHourlyRate" <= 0);

UPDATE "Course" c
SET "hourlyRate" = COALESCE(c."hourlyRate", s."defaultHourlyRate", 150)
FROM "School" s
WHERE c."schoolId" = s.id
  AND c.id LIKE 'seed-course-%'
  AND c."hourlyRate" IS NULL;
