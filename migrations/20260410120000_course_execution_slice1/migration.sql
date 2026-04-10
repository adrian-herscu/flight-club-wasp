-- Extend CourseLifecycleStatus with execution-phase values (§1 state machine).
ALTER TYPE "CourseLifecycleStatus" ADD VALUE 'STARTED';
ALTER TYPE "CourseLifecycleStatus" ADD VALUE 'COMPLETED';

-- Add instructor assignment fields required for course start guards.
-- isLead: exactly one must be true when course is started (INV-16).
-- agreedWagePerHour: must be non-null on every row when course is started (INV-18).
ALTER TABLE "AssignedInstructor" ADD COLUMN "isLead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssignedInstructor" ADD COLUMN "agreedWagePerHour" INTEGER;
