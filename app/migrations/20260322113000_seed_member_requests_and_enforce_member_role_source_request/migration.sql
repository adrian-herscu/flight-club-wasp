-- Seed approved instructor/student registration requests for existing Cloudbase seeded members.
-- This aligns seeded UserSchoolRole membership history with the member-requests workflow UI.

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
    'seed-request-student-01-cloudbase',
    'seed-user-student-01',
    now(),
    'STUDENT',
    'APPROVED',
    'seed-school-cloudbase-paragliding',
    'seed-user-school-manager-01',
    now()
  )
ON CONFLICT ("id") DO NOTHING;

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
    'seed-decision-student-01-cloudbase',
    'APPROVED',
    'seed-request-student-01-cloudbase',
    'seed-user-school-manager-01'
  )
ON CONFLICT ("requestId") DO NOTHING;

UPDATE "UserSchoolRole"
SET
  "sourceRegistrationRequestId" = 'seed-request-instructor-01-cloudbase',
  "grantedByUserId" = COALESCE("grantedByUserId", 'seed-user-school-manager-01')
WHERE "userId" = 'seed-user-instructor-01'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'INSTRUCTOR';

UPDATE "UserSchoolRole"
SET
  "sourceRegistrationRequestId" = 'seed-request-student-01-cloudbase',
  "grantedByUserId" = COALESCE("grantedByUserId", 'seed-user-school-manager-01')
WHERE "userId" = 'seed-user-student-01'
  AND "schoolId" = 'seed-school-cloudbase-paragliding'
  AND "role" = 'STUDENT';

-- Enforce DB-level integrity for member roles: INSTRUCTOR/STUDENT school memberships
-- must reference an APPROVED registration request with matching requester, school, and role.
CREATE OR REPLACE FUNCTION "enforce_member_role_source_registration_request"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  request_row "RegistrationRequest"%ROWTYPE;
BEGIN
  IF NEW."role" IN ('INSTRUCTOR'::"SchoolRole", 'STUDENT'::"SchoolRole") THEN
    -- Allow FK ON DELETE SET NULL behavior when historical request rows are removed.
    IF TG_OP = 'UPDATE'
      AND OLD."sourceRegistrationRequestId" IS NOT NULL
      AND NEW."sourceRegistrationRequestId" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "RegistrationRequest" rr
        WHERE rr."id" = OLD."sourceRegistrationRequestId"
      )
    THEN
      RETURN NEW;
    END IF;

    IF NEW."sourceRegistrationRequestId" IS NULL THEN
      RAISE EXCEPTION 'UserSchoolRole for role % must have sourceRegistrationRequestId', NEW."role";
    END IF;

    SELECT rr.*
      INTO request_row
    FROM "RegistrationRequest" rr
    WHERE rr."id" = NEW."sourceRegistrationRequestId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'sourceRegistrationRequestId % not found in RegistrationRequest', NEW."sourceRegistrationRequestId";
    END IF;

    IF request_row."status" <> 'APPROVED'::"RegistrationRequestStatus" THEN
      RAISE EXCEPTION 'RegistrationRequest % must be APPROVED', request_row."id";
    END IF;

    IF request_row."requesterId" <> NEW."userId" THEN
      RAISE EXCEPTION 'RegistrationRequest % requesterId % does not match UserSchoolRole userId %',
        request_row."id", request_row."requesterId", NEW."userId";
    END IF;

    IF request_row."targetSchoolId" IS DISTINCT FROM NEW."schoolId" THEN
      RAISE EXCEPTION 'RegistrationRequest % targetSchoolId % does not match UserSchoolRole schoolId %',
        request_row."id", request_row."targetSchoolId", NEW."schoolId";
    END IF;

    IF request_row."requestedRole"::text <> NEW."role"::text THEN
      RAISE EXCEPTION 'RegistrationRequest % requestedRole % does not match UserSchoolRole role %',
        request_row."id", request_row."requestedRole", NEW."role";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "enforce_member_role_source_registration_request"
  ON "UserSchoolRole";

CREATE CONSTRAINT TRIGGER "enforce_member_role_source_registration_request"
AFTER INSERT OR UPDATE
ON "UserSchoolRole"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_member_role_source_registration_request"();
