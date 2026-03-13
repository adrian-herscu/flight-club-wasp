ALTER TABLE "User"
  RENAME COLUMN "username" TO "fullName";

DROP INDEX IF EXISTS "User_username_key";

ALTER TABLE "User"
  ALTER COLUMN "email" SET NOT NULL;
