-- Migration: drop legacy User.role, introduce User.isSystemAdmin
--
-- Strategy:
--   1. Add isSystemAdmin column (default false).
--   2. Back-fill: set isSystemAdmin = true for any user whose role was 'SYSTEM_ADMIN'.
--   3. Fix missing UserSchoolRole entry for seeded school manager at primary school.
--   4. Drop the role column and the UserRole enum.

-- Step 1: add new column
ALTER TABLE "User" ADD COLUMN "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: back-fill system admins
UPDATE "User" SET "isSystemAdmin" = true WHERE role = 'SYSTEM_ADMIN'::"UserRole";

-- Step 3: ensure seeded school manager has UserSchoolRole at primary school
INSERT INTO "UserSchoolRole" (
  id,
  "userId",
  "schoolId",
  role,
  "grantedByUserId",
  "sourceRegistrationRequestId"
)
VALUES (
  'seed-role-school-manager-01-cloudbase',
  'seed-user-school-manager-01',
  'seed-school-cloudbase-paragliding',
  'SCHOOL_MANAGER'::"SchoolRole",
  'seed-user-system-admin-01',
  'seed-request-school-manager-cloudbase'
)
ON CONFLICT ("userId", "schoolId", role) DO NOTHING;

-- Step 4: drop the role column and the enum
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE IF EXISTS "UserRole";
