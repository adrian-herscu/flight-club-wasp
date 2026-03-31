-- Allow updates and deletes on CourseInterest table
-- (remove immutability triggers)
DROP TRIGGER IF EXISTS prevent_update_courseinterest ON "CourseInterest";
DROP TRIGGER IF EXISTS prevent_delete_courseinterest ON "CourseInterest";
