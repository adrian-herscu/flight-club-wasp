-- Seed deterministic, readable users: 2 users per role.
-- Idempotent behavior: update existing rows matched by email or username, otherwise insert.

DO $$
DECLARE
  seeded_user RECORD;
  resolved_user_id TEXT;
BEGIN
  FOR seeded_user IN
    SELECT *
    FROM (
      VALUES
        ('seed-user-system-admin-01', 'seed+system_admin.01@example.test', 'system_admin_01', 'SYSTEM_ADMIN'::"UserRole"),
        ('seed-user-system-admin-02', 'seed+system_admin.02@example.test', 'system_admin_02', 'SYSTEM_ADMIN'::"UserRole"),

        ('seed-user-school-manager-01', 'seed+school_manager.01@example.test', 'school_manager_01', 'SCHOOL_MANAGER'::"UserRole"),
        ('seed-user-school-manager-02', 'seed+school_manager.02@example.test', 'school_manager_02', 'SCHOOL_MANAGER'::"UserRole"),

        ('seed-user-instructor-01', 'seed+instructor.01@example.test', 'instructor_01', 'INSTRUCTOR'::"UserRole"),
        ('seed-user-instructor-02', 'seed+instructor.02@example.test', 'instructor_02', 'INSTRUCTOR'::"UserRole"),

        ('seed-user-student-01', 'seed+student.01@example.test', 'student_01', 'STUDENT'::"UserRole"),
        ('seed-user-student-02', 'seed+student.02@example.test', 'student_02', 'STUDENT'::"UserRole"),

        ('seed-user-user-01', 'seed+user.01@example.test', 'user_01', 'USER'::"UserRole"),
        ('seed-user-user-02', 'seed+user.02@example.test', 'user_02', 'USER'::"UserRole")
    ) AS seed_data(id, email, username, role)
  LOOP
    resolved_user_id := NULL;

     SELECT u.id
      INTO resolved_user_id
    FROM "User" u
     WHERE u.email = seeded_user.email
       OR u.username = seeded_user.username
    LIMIT 1;

    IF resolved_user_id IS NULL THEN
      INSERT INTO "User" (
        id,
        email,
        username,
        phone,
        role,
        "sendNewsletter",
        credits,
        "subscriptionStatus",
        "subscriptionPlan",
        "datePaid",
        "paymentProcessorUserId",
        "lemonSqueezyCustomerPortalUrl"
      )
      VALUES (
        seeded_user.id,
        seeded_user.email,
        seeded_user.username,
        NULL,
        seeded_user.role,
        false,
        0,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      )
      ON CONFLICT (email)
      DO UPDATE SET
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        phone = NULL,
        "sendNewsletter" = false,
        credits = 0,
        "subscriptionStatus" = NULL,
        "subscriptionPlan" = NULL,
        "datePaid" = NULL,
        "paymentProcessorUserId" = NULL,
        "lemonSqueezyCustomerPortalUrl" = NULL
      RETURNING id INTO resolved_user_id;
    ELSE
      UPDATE "User"
      SET
        email = seeded_user.email,
        username = seeded_user.username,
        role = seeded_user.role,
        phone = NULL,
        "sendNewsletter" = false,
        credits = 0,
        "subscriptionStatus" = NULL,
        "subscriptionPlan" = NULL,
        "datePaid" = NULL,
        "paymentProcessorUserId" = NULL,
        "lemonSqueezyCustomerPortalUrl" = NULL
      WHERE id = resolved_user_id;
    END IF;

    IF seeded_user.role = 'INSTRUCTOR'::"UserRole" THEN
      INSERT INTO "Instructor" (id, "userId")
      VALUES ('seed-instructor-profile-' || right(seeded_user.id, 2), resolved_user_id)
      ON CONFLICT ("userId") DO NOTHING;
    ELSIF seeded_user.role = 'STUDENT'::"UserRole" THEN
      INSERT INTO "Student" (id, "userId")
      VALUES ('seed-student-profile-' || right(seeded_user.id, 2), resolved_user_id)
      ON CONFLICT ("userId") DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Make seeded role users login-capable via email/password auth.
-- Shared dev password for all seeded users: 12345678
-- Email verification is bypassed for these seeded users (isEmailVerified=true).

DO $$
DECLARE
  seeded_auth RECORD;
  resolved_user_id TEXT;
  resolved_auth_id TEXT;
  shared_password_hash TEXT := '$argon2id$v=19$m=19456,t=2,p=1$FJItxSZ1sFqqps3do8VYdQ$upLpFKSIBP+DPS1LGm/FfJ0lV3PAZozs7pXtT79uLyo';
BEGIN
  FOR seeded_auth IN
    SELECT *
    FROM (
      VALUES
        ('seed+system_admin.01@example.test', 'seed-auth-system-admin-01'),
        ('seed+system_admin.02@example.test', 'seed-auth-system-admin-02'),
        ('seed+school_manager.01@example.test', 'seed-auth-school-manager-01'),
        ('seed+school_manager.02@example.test', 'seed-auth-school-manager-02'),
        ('seed+instructor.01@example.test', 'seed-auth-instructor-01'),
        ('seed+instructor.02@example.test', 'seed-auth-instructor-02'),
        ('seed+student.01@example.test', 'seed-auth-student-01'),
        ('seed+student.02@example.test', 'seed-auth-student-02'),
        ('seed+user.01@example.test', 'seed-auth-user-01'),
        ('seed+user.02@example.test', 'seed-auth-user-02')
    ) AS seed_data(email, auth_id)
  LOOP
    resolved_user_id := NULL;
    resolved_auth_id := NULL;

    SELECT u.id
      INTO resolved_user_id
    FROM "User" u
    WHERE u.email = seeded_auth.email
    LIMIT 1;

    IF resolved_user_id IS NULL THEN
      RAISE NOTICE 'Skipping auth seed for %, user not found', seeded_auth.email;
      CONTINUE;
    END IF;

    INSERT INTO "Auth" (id, "userId")
    VALUES (seeded_auth.auth_id, resolved_user_id)
    ON CONFLICT ("userId")
    DO UPDATE SET "userId" = EXCLUDED."userId"
    RETURNING id INTO resolved_auth_id;

    INSERT INTO "AuthIdentity" (
      "providerName",
      "providerUserId",
      "providerData",
      "authId"
    )
    VALUES (
      'email',
      lower(seeded_auth.email),
      jsonb_build_object(
        'hashedPassword', shared_password_hash,
        'isEmailVerified', true,
        'emailVerificationSentAt', NULL,
        'passwordResetSentAt', NULL
      )::text,
      resolved_auth_id
    )
    ON CONFLICT ("providerName", "providerUserId")
    DO UPDATE SET
      "providerData" = EXCLUDED."providerData",
      "authId" = EXCLUDED."authId";
  END LOOP;
END $$;
