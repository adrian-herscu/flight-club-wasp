-- Fix seeded users to have proper fullName values set
-- This migration runs AFTER the username->fullName rename, so we update fullName
-- to contain the user identifiers (system_admin_01, school_manager_01, etc.)

UPDATE "User" u
SET "fullName" = seed_data.fullName
FROM (
  VALUES
    ('seed+system_admin.01@example.test', 'system_admin_01'),
    ('seed+system_admin.02@example.test', 'system_admin_02'),
    ('seed+school_manager.01@example.test', 'school_manager_01'),
    ('seed+school_manager.02@example.test', 'school_manager_02'),
    ('seed+instructor.01@example.test', 'instructor_01'),
    ('seed+instructor.02@example.test', 'instructor_02'),
    ('seed+student.01@example.test', 'student_01'),
    ('seed+student.02@example.test', 'student_02'),
    ('seed+user.01@example.test', 'user_01'),
    ('seed+user.02@example.test', 'user_02')
) AS seed_data(email, fullName)
WHERE u.email = seed_data.email;
