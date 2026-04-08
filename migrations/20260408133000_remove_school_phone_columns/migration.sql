-- Remove obsolete school-owned phone fields.
ALTER TABLE "School"
  DROP COLUMN IF EXISTS "phone";

ALTER TABLE "RegistrationRequest"
  DROP COLUMN IF EXISTS "requestedPhone";
