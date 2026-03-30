INSERT INTO "RegistrationRequest" (
  "id",
  "requesterId",
  "updatedAt",
  "requestedRole",
  "status",
  "requestedSchoolName",
  "requestedWebsiteUrl",
  "requestedPhone",
  "requestedAddressLine1",
  "requestedAddressLine2",
  "requestedCity",
  "requestedStateProvince",
  "requestedPostalCode",
  "requestedCountry",
  "requestedCurrency",
  "reviewerId",
  "reviewedAt",
  "approvedSchoolId"
)
VALUES (
  'seed-request-school-manager-cloudbase',
  'seed-user-school-manager-01',
  now(),
  'SCHOOL_MANAGER',
  'APPROVED',
  'Cloudbase Paragliding',
  NULL,
  NULL,
  '123 Mountain Ridge Road',
  NULL,
  'Boulder',
  'Colorado',
  '80301',
  'US',
  'USD',
  'seed-user-system-admin-01',
  now(),
  'seed-school-cloudbase-paragliding'
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
  'seed-decision-school-manager-cloudbase',
  'APPROVED',
  'seed-request-school-manager-cloudbase',
  'seed-user-system-admin-01',
  'seed-school-cloudbase-paragliding'
)
ON CONFLICT ("requestId") DO NOTHING;

INSERT INTO "UserSchoolRole" ("id", "userId", "schoolId", "role")
VALUES
  ('seed-role-instructor-01', 'seed-user-instructor-01', 'seed-school-cloudbase-paragliding', 'INSTRUCTOR'),
  ('seed-role-instructor-02', 'seed-user-instructor-02', 'seed-school-cloudbase-paragliding', 'INSTRUCTOR'),
  ('seed-role-student-01', 'seed-user-student-01', 'seed-school-cloudbase-paragliding', 'STUDENT'),
  ('seed-role-student-02', 'seed-user-student-02', 'seed-school-cloudbase-paragliding', 'STUDENT')
ON CONFLICT ("userId", "schoolId", "role") DO NOTHING;

UPDATE "UserSchoolRole"
SET "sourceRegistrationRequestId" = 'seed-request-school-manager-cloudbase'
WHERE "userId" = 'seed-user-school-manager-01'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'SCHOOL_MANAGER'
  AND "sourceRegistrationRequestId" IS NULL;
