DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = 'RegistrationRequest'
	) THEN
		ALTER TABLE public."RegistrationRequest"
			DROP CONSTRAINT IF EXISTS "RegistrationRequest_targetSchoolId_fkey";

		ALTER TABLE public."RegistrationRequest"
			ADD CONSTRAINT "RegistrationRequest_targetSchoolId_fkey"
			FOREIGN KEY ("targetSchoolId") REFERENCES public."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;
