-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");
