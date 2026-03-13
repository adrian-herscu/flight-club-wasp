-- DropForeignKey
ALTER TABLE "RegistrationRequest" DROP CONSTRAINT "RegistrationRequest_targetSchoolId_fkey";

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_targetSchoolId_fkey" FOREIGN KEY ("targetSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
