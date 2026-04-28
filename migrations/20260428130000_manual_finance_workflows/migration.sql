-- Manual finance workflows: discounted enrollments, manual payment metadata,
-- and manager-confirmed instructor payout obligations.

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD_TERMINAL', 'OTHER');
CREATE TYPE "InstructorPayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

ALTER TABLE "Transaction"
  ADD COLUMN "recordedByUserId" TEXT,
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "externalReference" TEXT;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_recordedByUserId_fkey"
  FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Transaction_recordedByUserId_idx" ON "Transaction"("recordedByUserId");

ALTER TABLE "EnrolledStudent"
  ADD COLUMN "listPriceMinor" INTEGER,
  ADD COLUMN "agreedPriceMinor" INTEGER,
  ADD COLUMN "concessionReason" TEXT,
  ADD COLUMN "concessionApprovedByUserId" TEXT,
  ADD COLUMN "concessionApprovedAt" TIMESTAMP(3);

UPDATE "EnrolledStudent" es
SET "listPriceMinor" = pricing.amount_minor
FROM (
  SELECT
    c.id AS course_id,
    ROUND((COALESCE(SUM(sl."durationMinutes"), 0)::numeric / 60.0) * c."hourlyRate")::integer AS amount_minor
  FROM "Course" c
  JOIN "SyllabusVersion" sv ON sv.id = c."syllabusVersionId"
  LEFT JOIN "SyllabusLesson" sl ON sl."syllabusVersionId" = sv.id
  GROUP BY c.id, c."hourlyRate"
) pricing
WHERE es."courseId" = pricing.course_id;

ALTER TABLE "EnrolledStudent"
  ALTER COLUMN "listPriceMinor" SET NOT NULL;

ALTER TABLE "EnrolledStudent"
  ADD CONSTRAINT "EnrolledStudent_concessionApprovedByUserId_fkey"
  FOREIGN KEY ("concessionApprovedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InstructorPayout" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "schoolId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseLessonId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "InstructorPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" "PaymentMethod",
  "externalReference" TEXT,
  "notes" TEXT,
  "paidAt" TIMESTAMP(3),
  "paidByUserId" TEXT,
  "withdrawalTransactionId" TEXT,
  "depositTransactionId" TEXT,
  CONSTRAINT "InstructorPayout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstructorPayout_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InstructorPayout_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InstructorPayout_courseLessonId_fkey" FOREIGN KEY ("courseLessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InstructorPayout_courseId_instructorId_fkey" FOREIGN KEY ("courseId", "instructorId") REFERENCES "AssignedInstructor"("courseId", "instructorId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InstructorPayout_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InstructorPayout_courseLessonId_instructorId_key" ON "InstructorPayout"("courseLessonId", "instructorId");
CREATE INDEX "InstructorPayout_schoolId_status_createdAt_idx" ON "InstructorPayout"("schoolId", "status", "createdAt");
CREATE INDEX "InstructorPayout_instructorId_status_idx" ON "InstructorPayout"("instructorId", "status");