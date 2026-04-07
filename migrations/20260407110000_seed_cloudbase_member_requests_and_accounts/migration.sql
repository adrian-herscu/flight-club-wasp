-- Backfill deterministic member-request and account fixtures for seeded Cloudbase members.
-- Ensures all seeded instructor/student users are visible in manager member-request and assignment flows.

INSERT INTO "RegistrationRequest" (
  "id",
  "requesterId",
  "updatedAt",
  "requestedRole",
  "status",
  "targetSchoolId",
  "reviewerId",
  "reviewedAt"
)
VALUES
  (
    'seed-request-instructor-01-cloudbase',
    'seed-user-instructor-01',
    now(),
    'INSTRUCTOR',
    'APPROVED',
    'seed-school-cloudbase-paragliding',
    'seed-user-school-manager-01',
    now()
  ),
  (
    'seed-request-instructor-02-cloudbase',
    'seed-user-instructor-02',
    now(),
    'INSTRUCTOR',
    'APPROVED',
    'seed-school-cloudbase-paragliding',
    'seed-user-school-manager-01',
    now()
  ),
  (
    'seed-request-student-01-cloudbase',
    'seed-user-student-01',
    now(),
    'STUDENT',
    'APPROVED',
    'seed-school-cloudbase-paragliding',
    'seed-user-school-manager-01',
    now()
  ),
  (
    'seed-request-student-02-cloudbase',
    'seed-user-student-02',
    now(),
    'STUDENT',
    'APPROVED',
    'seed-school-cloudbase-paragliding',
    'seed-user-school-manager-01',
    now()
  )
ON CONFLICT ("id")
DO UPDATE SET
  "requesterId" = EXCLUDED."requesterId",
  "updatedAt" = EXCLUDED."updatedAt",
  "requestedRole" = EXCLUDED."requestedRole",
  "status" = EXCLUDED."status",
  "targetSchoolId" = EXCLUDED."targetSchoolId",
  "reviewerId" = EXCLUDED."reviewerId",
  "reviewedAt" = EXCLUDED."reviewedAt";

INSERT INTO "RegistrationRequestDecision" (
  "id",
  "decisionType",
  "requestId",
  "reviewerId"
)
VALUES
  (
    'seed-decision-instructor-01-cloudbase',
    'APPROVED',
    'seed-request-instructor-01-cloudbase',
    'seed-user-school-manager-01'
  ),
  (
    'seed-decision-instructor-02-cloudbase',
    'APPROVED',
    'seed-request-instructor-02-cloudbase',
    'seed-user-school-manager-01'
  ),
  (
    'seed-decision-student-01-cloudbase',
    'APPROVED',
    'seed-request-student-01-cloudbase',
    'seed-user-school-manager-01'
  ),
  (
    'seed-decision-student-02-cloudbase',
    'APPROVED',
    'seed-request-student-02-cloudbase',
    'seed-user-school-manager-01'
  )
ON CONFLICT ("requestId")
DO UPDATE SET
  "decisionType" = EXCLUDED."decisionType",
  "reviewerId" = EXCLUDED."reviewerId";

INSERT INTO "Account" (
  "id",
  "createdAt",
  "userId",
  "schoolId",
  "currency",
  "balanceMinor"
)
VALUES
  (
    'seed-account-instructor-01-cloudbase',
    now(),
    'seed-user-instructor-01',
    'seed-school-cloudbase-paragliding',
    'USD',
    0
  ),
  (
    'seed-account-instructor-02-cloudbase',
    now(),
    'seed-user-instructor-02',
    'seed-school-cloudbase-paragliding',
    'USD',
    0
  ),
  (
    'seed-account-student-01-cloudbase',
    now(),
    'seed-user-student-01',
    'seed-school-cloudbase-paragliding',
    'USD',
    0
  ),
  (
    'seed-account-student-02-cloudbase',
    now(),
    'seed-user-student-02',
    'seed-school-cloudbase-paragliding',
    'USD',
    0
  )
ON CONFLICT ("userId", "schoolId") DO NOTHING;

UPDATE "UserSchoolRole"
SET
  "sourceRegistrationRequestId" = 'seed-request-instructor-01-cloudbase',
  "grantedByUserId" = COALESCE("grantedByUserId", 'seed-user-school-manager-01')
WHERE "userId" = 'seed-user-instructor-01'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'INSTRUCTOR';

UPDATE "UserSchoolRole"
SET
  "sourceRegistrationRequestId" = 'seed-request-instructor-02-cloudbase',
  "grantedByUserId" = COALESCE("grantedByUserId", 'seed-user-school-manager-01')
WHERE "userId" = 'seed-user-instructor-02'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'INSTRUCTOR';

UPDATE "UserSchoolRole"
SET
  "sourceRegistrationRequestId" = 'seed-request-student-01-cloudbase',
  "grantedByUserId" = COALESCE("grantedByUserId", 'seed-user-school-manager-01')
WHERE "userId" = 'seed-user-student-01'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'STUDENT';

UPDATE "UserSchoolRole"
SET
  "sourceRegistrationRequestId" = 'seed-request-student-02-cloudbase',
  "grantedByUserId" = COALESCE("grantedByUserId", 'seed-user-school-manager-01')
WHERE "userId" = 'seed-user-student-02'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'STUDENT';
