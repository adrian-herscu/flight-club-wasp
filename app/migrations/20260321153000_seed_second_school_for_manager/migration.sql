-- Seed a second school for seed+school_manager.01@example.test

INSERT INTO "School" (
  id,
  name,
  "addressLine1",
  "addressLine2",
  city,
  "stateProvince",
  "postalCode",
  country,
  currency,
  "adminId"
)
VALUES (
  'seed-school-cloudbase-annex',
  'Cloudbase Annex',
  '125 Mountain Ridge Road',
  NULL,
  'Boulder',
  'Colorado',
  '80302',
  'US',
  'USD',
  'seed-user-school-manager-01'
)
ON CONFLICT ("name", country) DO NOTHING;

INSERT INTO "Account" (
  id,
  "createdAt",
  "userId",
  "schoolId",
  currency,
  "balanceMinor"
)
VALUES (
  'seed-account-manager-cloudbase-annex',
  now(),
  'seed-user-school-manager-01',
  'seed-school-cloudbase-annex',
  'USD',
  0
)
ON CONFLICT ("userId", "schoolId") DO NOTHING;

INSERT INTO "UserSchoolRole" (
  id,
  "createdAt",
  "grantedAt",
  "userId",
  "schoolId",
  role
)
VALUES (
  'seed-role-school-manager-01-cloudbase-annex',
  now(),
  now(),
  'seed-user-school-manager-01',
  'seed-school-cloudbase-annex',
  'SCHOOL_MANAGER'::"SchoolRole"
)
ON CONFLICT ("userId", "schoolId", role) DO NOTHING;
