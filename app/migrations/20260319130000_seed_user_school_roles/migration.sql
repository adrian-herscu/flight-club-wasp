INSERT INTO "UserSchoolRole" ("id", "userId", "schoolId", "role")
VALUES
  ('seed-role-instructor-01', 'seed-user-instructor-01', 'seed-school-cloudbase-paragliding', 'INSTRUCTOR'),
  ('seed-role-instructor-02', 'seed-user-instructor-02', 'seed-school-cloudbase-paragliding', 'INSTRUCTOR'),
  ('seed-role-student-01', 'seed-user-student-01', 'seed-school-cloudbase-paragliding', 'STUDENT'),
  ('seed-role-student-02', 'seed-user-student-02', 'seed-school-cloudbase-paragliding', 'STUDENT')
ON CONFLICT ("userId", "schoolId", "role") DO NOTHING;
