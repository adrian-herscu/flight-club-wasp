-- Enforce pricing invariants at DB layer:
-- 1) Course hourly rate is required and positive.
-- 2) School default hourly rate remains optional, but must be positive when provided.
-- 3) Syllabus lesson duration must remain positive.

UPDATE "Course" c
SET "hourlyRate" = COALESCE(c."hourlyRate", s."defaultHourlyRate", 150)
FROM "School" s
WHERE c."schoolId" = s.id
	AND c."hourlyRate" IS NULL;

ALTER TABLE "SyllabusLesson"
ADD CONSTRAINT "SyllabusLesson_durationMinutes_positive_chk"
CHECK ("durationMinutes" > 0);

ALTER TABLE "School"
ADD CONSTRAINT "School_defaultHourlyRate_positive_when_set_chk"
CHECK ("defaultHourlyRate" IS NULL OR "defaultHourlyRate" > 0);

ALTER TABLE "Course"
ALTER COLUMN "hourlyRate" SET NOT NULL;

ALTER TABLE "Course"
ADD CONSTRAINT "Course_hourlyRate_positive_chk"
CHECK ("hourlyRate" > 0);
