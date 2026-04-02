-- Enforce domain invariant: a FINAL syllabus version must have at least one lesson.
--
-- We use DEFERRABLE constraint triggers so transactions that create a FINAL
-- version and then insert lessons in the same transaction remain valid.

CREATE OR REPLACE FUNCTION enforce_final_syllabus_version_has_lessons()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'FINAL' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "SyllabusLesson" sl
      WHERE sl."syllabusVersionId" = NEW.id
    ) THEN
      RAISE EXCEPTION 'FINAL syllabus version must have at least one lesson';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS syllabus_version_final_requires_lessons ON "SyllabusVersion";
CREATE CONSTRAINT TRIGGER syllabus_version_final_requires_lessons
AFTER INSERT OR UPDATE OF status ON "SyllabusVersion"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_final_syllabus_version_has_lessons();


CREATE OR REPLACE FUNCTION enforce_final_syllabus_non_empty_on_lesson_mutation()
RETURNS TRIGGER AS $$
DECLARE
  affected_version_id TEXT;
BEGIN
  affected_version_id := COALESCE(NEW."syllabusVersionId", OLD."syllabusVersionId");

  IF EXISTS (
    SELECT 1
    FROM "SyllabusVersion" sv
    WHERE sv.id = affected_version_id
      AND sv.status = 'FINAL'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "SyllabusLesson" sl
      WHERE sl."syllabusVersionId" = affected_version_id
    ) THEN
      RAISE EXCEPTION 'FINAL syllabus version must have at least one lesson';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS final_syllabus_non_empty_on_lesson_mutation ON "SyllabusLesson";
CREATE CONSTRAINT TRIGGER final_syllabus_non_empty_on_lesson_mutation
AFTER INSERT OR UPDATE OR DELETE ON "SyllabusLesson"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_final_syllabus_non_empty_on_lesson_mutation();
