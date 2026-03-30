-- Remove legacy course default lesson price (prototype-only cleanup, no data preservation required)
ALTER TABLE "Course"
DROP COLUMN "defaultLessonPrice";
