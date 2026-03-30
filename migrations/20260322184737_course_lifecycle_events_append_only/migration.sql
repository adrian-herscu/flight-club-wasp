/*
  Warnings:

  - You are about to drop the column `status` on the `Course` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CourseLifecycleStatus" AS ENUM ('CLOSED', 'REOPENED');

-- DropIndex
DROP INDEX "Course_status_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "status";

-- DropEnum
DROP TYPE "CourseStatus";

-- CreateTable
CREATE TABLE "CourseLifecycleEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "status" "CourseLifecycleStatus" NOT NULL,

    CONSTRAINT "CourseLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseLifecycleEvent_courseId_createdAt_idx" ON "CourseLifecycleEvent"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseLifecycleEvent_changedByUserId_createdAt_idx" ON "CourseLifecycleEvent"("changedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "CourseLifecycleEvent" ADD CONSTRAINT "CourseLifecycleEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLifecycleEvent" ADD CONSTRAINT "CourseLifecycleEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
