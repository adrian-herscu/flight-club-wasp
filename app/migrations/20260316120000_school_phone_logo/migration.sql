ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "phone" TEXT;

ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

ALTER TABLE "RegistrationRequest"
  ADD COLUMN IF NOT EXISTS "requestedPhone" TEXT;

ALTER TABLE "RegistrationRequest"
  ADD COLUMN IF NOT EXISTS "requestedLogoUrl" TEXT;
