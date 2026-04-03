-- Rewrite any remaining CONTACTED interests into INTERESTED before removing the enum value.
UPDATE "CourseInterest"
SET "status" = 'INTERESTED'
WHERE "status" = 'CONTACTED';

ALTER TYPE "CourseInterestStatus" RENAME TO "CourseInterestStatus_old";
CREATE TYPE "CourseInterestStatus" AS ENUM ('INTERESTED', 'ENROLLED', 'CANCELLED');

ALTER TABLE "CourseInterest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CourseInterestStatus"
  USING ("status"::text::"CourseInterestStatus"),
  ALTER COLUMN "status" SET DEFAULT 'INTERESTED';

DROP TYPE "CourseInterestStatus_old";
