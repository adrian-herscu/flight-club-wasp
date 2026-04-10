-- ============================================================================
-- Slice 5 + 7: StudentLessonEvaluation.attended, RefundRequestStatus enum,
-- RefundRequest model.
-- ============================================================================

-- Add attended column to StudentLessonEvaluation
ALTER TABLE "StudentLessonEvaluation"
  ADD COLUMN "attended" BOOLEAN;

-- Backfill: existing evaluations default to attended = true
UPDATE "StudentLessonEvaluation" SET "attended" = TRUE WHERE "attended" IS NULL;

-- Make attended NOT NULL
ALTER TABLE "StudentLessonEvaluation" ALTER COLUMN "attended" SET NOT NULL;

-- RefundRequestStatus enum
CREATE TYPE "RefundRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'DECLINED'
);

-- RefundRequest table
CREATE TABLE "RefundRequest" (
  "id"                  TEXT          NOT NULL,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "courseId"            TEXT          NOT NULL,
  "studentId"           TEXT          NOT NULL,
  "status"              "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAmountMinor" INTEGER,
  "reason"              TEXT,
  "reviewedByUserId"    TEXT,
  "reviewedAt"          TIMESTAMP(3),
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefundRequest_courseId_fkey"   FOREIGN KEY ("courseId")         REFERENCES "Course"("id")   ON DELETE CASCADE,
  CONSTRAINT "RefundRequest_studentId_fkey"  FOREIGN KEY ("studentId")        REFERENCES "Student"("id")  ON DELETE RESTRICT,
  CONSTRAINT "RefundRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "RefundRequest_courseId_studentId_status_idx" ON "RefundRequest"("courseId", "studentId", "status");
CREATE INDEX "RefundRequest_studentId_idx"                  ON "RefundRequest"("studentId");
