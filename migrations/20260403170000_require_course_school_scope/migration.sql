-- Enforce school-scoped courses only (remove unscoped legacy course rows).
-- 1) Backfill Course.schoolId from the owning syllabus when possible.
-- 2) Remove remaining unscoped courses.
-- 3) Enforce NOT NULL and non-null-preserving FK semantics.

ALTER TABLE "Course" DISABLE TRIGGER USER;
ALTER TABLE "CourseInterest" DISABLE TRIGGER USER;
ALTER TABLE "CourseLesson" DISABLE TRIGGER USER;
ALTER TABLE "AssignedInstructor" DISABLE TRIGGER USER;
ALTER TABLE "EnrolledStudent" DISABLE TRIGGER USER;
ALTER TABLE "CourseLifecycleEvent" DISABLE TRIGGER USER;
ALTER TABLE "StudentLessonEvaluation" DISABLE TRIGGER USER;

UPDATE "Course" AS c
SET "schoolId" = s."schoolId"
FROM "SyllabusVersion" AS sv
JOIN "Syllabus" AS s ON s."id" = sv."syllabusId"
WHERE c."syllabusVersionId" = sv."id"
  AND c."schoolId" IS NULL
  AND s."schoolId" IS NOT NULL;

DELETE FROM "Course"
WHERE "schoolId" IS NULL;

ALTER TABLE "StudentLessonEvaluation" ENABLE TRIGGER USER;
ALTER TABLE "CourseLifecycleEvent" ENABLE TRIGGER USER;
ALTER TABLE "EnrolledStudent" ENABLE TRIGGER USER;
ALTER TABLE "AssignedInstructor" ENABLE TRIGGER USER;
ALTER TABLE "CourseLesson" ENABLE TRIGGER USER;
ALTER TABLE "CourseInterest" ENABLE TRIGGER USER;
ALTER TABLE "Course" ENABLE TRIGGER USER;

ALTER TABLE "Course" DROP CONSTRAINT "Course_schoolId_fkey";
ALTER TABLE "Course" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "Course"
  ADD CONSTRAINT "Course_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
