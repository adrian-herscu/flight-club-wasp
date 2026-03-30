-- Add school-level and course-level hourly rate baselines (whole currency units)
ALTER TABLE "School"
ADD COLUMN "defaultHourlyRate" INTEGER;

ALTER TABLE "Course"
ADD COLUMN "hourlyRate" INTEGER;
