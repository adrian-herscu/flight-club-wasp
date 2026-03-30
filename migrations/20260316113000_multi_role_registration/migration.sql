DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolRole') THEN
    CREATE TYPE "SchoolRole" AS ENUM ('SCHOOL_MANAGER', 'INSTRUCTOR', 'STUDENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationRequestDecisionType') THEN
    CREATE TYPE "RegistrationRequestDecisionType" AS ENUM ('APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE "UserSchoolRole" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "role" "SchoolRole" NOT NULL,
  "grantedByUserId" TEXT,
  "sourceRegistrationRequestId" TEXT,
  CONSTRAINT "UserSchoolRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationRequestDecision" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decisionType" "RegistrationRequestDecisionType" NOT NULL,
  "reason" TEXT,
  "requestId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "approvedSchoolId" TEXT,
  CONSTRAINT "RegistrationRequestDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSchoolRole_userId_schoolId_role_key"
  ON "UserSchoolRole"("userId", "schoolId", "role");
CREATE INDEX "UserSchoolRole_schoolId_role_idx"
  ON "UserSchoolRole"("schoolId", "role");
CREATE INDEX "UserSchoolRole_userId_role_idx"
  ON "UserSchoolRole"("userId", "role");

CREATE UNIQUE INDEX "RegistrationRequestDecision_requestId_key"
  ON "RegistrationRequestDecision"("requestId");
CREATE INDEX "RegistrationRequestDecision_createdAt_idx"
  ON "RegistrationRequestDecision"("createdAt");
CREATE INDEX "RegistrationRequestDecision_reviewerId_createdAt_idx"
  ON "RegistrationRequestDecision"("reviewerId", "createdAt");

ALTER TABLE "UserSchoolRole"
  ADD CONSTRAINT "UserSchoolRole_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSchoolRole"
  ADD CONSTRAINT "UserSchoolRole_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSchoolRole"
  ADD CONSTRAINT "UserSchoolRole_grantedByUserId_fkey"
  FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSchoolRole"
  ADD CONSTRAINT "UserSchoolRole_sourceRegistrationRequestId_fkey"
  FOREIGN KEY ("sourceRegistrationRequestId") REFERENCES "RegistrationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequestDecision"
  ADD CONSTRAINT "RegistrationRequestDecision_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "RegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationRequestDecision"
  ADD CONSTRAINT "RegistrationRequestDecision_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistrationRequestDecision"
  ADD CONSTRAINT "RegistrationRequestDecision_approvedSchoolId_fkey"
  FOREIGN KEY ("approvedSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "RegistrationRequest_requesterId_key";

CREATE INDEX "RegistrationRequest_requesterId_createdAt_idx"
  ON "RegistrationRequest"("requesterId", "createdAt");

CREATE UNIQUE INDEX "RegistrationRequest_pending_role_request_key"
  ON "RegistrationRequest"(
    "requesterId",
    "requestedRole",
    COALESCE("targetSchoolId", ''),
    COALESCE(lower("requestedSchoolName"), ''),
    COALESCE(upper("requestedCountry"), '')
  )
  WHERE "status" = 'PENDING'::"RegistrationRequestStatus";

INSERT INTO "RegistrationRequestDecision" (
  "id",
  "createdAt",
  "decisionType",
  "reason",
  "requestId",
  "reviewerId",
  "approvedSchoolId"
)
SELECT
  'backfill-registration-request-decision-' || rr."id",
  COALESCE(rr."reviewedAt", rr."updatedAt", rr."createdAt"),
  CASE rr."status"
    WHEN 'APPROVED'::"RegistrationRequestStatus" THEN 'APPROVED'::"RegistrationRequestDecisionType"
    WHEN 'REJECTED'::"RegistrationRequestStatus" THEN 'REJECTED'::"RegistrationRequestDecisionType"
  END,
  rr."rejectionReason",
  rr."id",
  rr."reviewerId",
  rr."approvedSchoolId"
FROM "RegistrationRequest" rr
WHERE rr."status" IN ('APPROVED'::"RegistrationRequestStatus", 'REJECTED'::"RegistrationRequestStatus")
ON CONFLICT ("requestId") DO NOTHING;

INSERT INTO "UserSchoolRole" (
  "id",
  "createdAt",
  "grantedAt",
  "userId",
  "schoolId",
  "role",
  "grantedByUserId",
  "sourceRegistrationRequestId"
)
SELECT
  'backfill-school-manager-role-' || s."id",
  s."createdAt",
  s."createdAt",
  s."adminId",
  s."id",
  'SCHOOL_MANAGER'::"SchoolRole",
  s."adminId",
  rr."id"
FROM "School" s
LEFT JOIN "RegistrationRequest" rr
  ON rr."approvedSchoolId" = s."id"
 AND rr."requesterId" = s."adminId"
 AND rr."requestedRole" = 'SCHOOL_MANAGER'::"RegistrationRequestRole"
 AND rr."status" = 'APPROVED'::"RegistrationRequestStatus"
ON CONFLICT ("userId", "schoolId", "role") DO NOTHING;

INSERT INTO "UserSchoolRole" (
  "id",
  "createdAt",
  "grantedAt",
  "userId",
  "schoolId",
  "role",
  "grantedByUserId",
  "sourceRegistrationRequestId"
)
SELECT
  'backfill-member-role-' || rr."id",
  rr."createdAt",
  COALESCE(rr."reviewedAt", rr."createdAt"),
  rr."requesterId",
  rr."targetSchoolId",
  rr."requestedRole"::text::"SchoolRole",
  rr."reviewerId",
  rr."id"
FROM "RegistrationRequest" rr
WHERE rr."status" = 'APPROVED'::"RegistrationRequestStatus"
  AND rr."requestedRole" IN ('INSTRUCTOR'::"RegistrationRequestRole", 'STUDENT'::"RegistrationRequestRole")
  AND rr."targetSchoolId" IS NOT NULL
ON CONFLICT ("userId", "schoolId", "role") DO NOTHING;
