-- Seed APPROVED registration request for school manager's second school (Cloudbase Annex)
INSERT INTO "RegistrationRequest" (
  "id",
  "requesterId",
  "updatedAt",
  "requestedRole",
  "status",
  "targetSchoolId",
  "reviewerId",
  "reviewedAt",
  "approvedSchoolId"
)
VALUES (
  'seed-request-school-manager-cloudbase-annex',
  'seed-user-school-manager-01',
  now(),
  'SCHOOL_MANAGER',
  'APPROVED',
  'seed-school-cloudbase-annex',
  'seed-user-system-admin-01',
  now(),
  'seed-school-cloudbase-annex'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RegistrationRequestDecision" (
  "id",
  "decisionType",
  "requestId",
  "reviewerId",
  "approvedSchoolId"
)
VALUES (
  'seed-decision-school-manager-cloudbase-annex',
  'APPROVED',
  'seed-request-school-manager-cloudbase-annex',
  'seed-user-system-admin-01',
  'seed-school-cloudbase-annex'
)
ON CONFLICT ("requestId") DO NOTHING;

UPDATE "UserSchoolRole"
SET "sourceRegistrationRequestId" = 'seed-request-school-manager-cloudbase-annex'
WHERE "userId" = 'seed-user-school-manager-01'
  AND "schoolId" = 'seed-school-cloudbase-annex'
  AND "role" = 'SCHOOL_MANAGER'
  AND "sourceRegistrationRequestId" IS NULL;
