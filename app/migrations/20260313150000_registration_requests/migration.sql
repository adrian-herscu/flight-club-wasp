-- Create enums for registration requests
CREATE TYPE "RegistrationRequestRole" AS ENUM ('SCHOOL_MANAGER', 'INSTRUCTOR', 'STUDENT');
CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create onboarding registration request table
CREATE TABLE "RegistrationRequest" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  "requesterId" TEXT NOT NULL,
  "requestedRole" "RegistrationRequestRole" NOT NULL,
  "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',

  "targetSchoolId" TEXT,

  "requestedSchoolName" TEXT,
  "requestedAddressLine1" TEXT,
  "requestedAddressLine2" TEXT,
  "requestedCity" TEXT,
  "requestedStateProvince" TEXT,
  "requestedPostalCode" TEXT,
  "requestedCountry" TEXT,
  "requestedCurrency" TEXT,

  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,

  "approvedSchoolId" TEXT,

  CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- Exactly one request per user account
CREATE UNIQUE INDEX "RegistrationRequest_requesterId_key" ON "RegistrationRequest"("requesterId");

CREATE INDEX "RegistrationRequest_status_requestedRole_createdAt_idx"
  ON "RegistrationRequest"("status", "requestedRole", "createdAt");

CREATE INDEX "RegistrationRequest_targetSchoolId_status_createdAt_idx"
  ON "RegistrationRequest"("targetSchoolId", "status", "createdAt");

ALTER TABLE "RegistrationRequest"
  ADD CONSTRAINT "RegistrationRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest"
  ADD CONSTRAINT "RegistrationRequest_targetSchoolId_fkey"
  FOREIGN KEY ("targetSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest"
  ADD CONSTRAINT "RegistrationRequest_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest"
  ADD CONSTRAINT "RegistrationRequest_approvedSchoolId_fkey"
  FOREIGN KEY ("approvedSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Allow managers to edit school details by removing update lock only.
DROP TRIGGER IF EXISTS prevent_update_school ON "School";
