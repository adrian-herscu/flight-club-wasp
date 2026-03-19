/**
 * Shared test helpers: seeded IDs, context factories, and data cleanup.
 *
 * All IDs below match the deterministic seed migrations under
 * app/migrations/20260309103000_seed_users_by_role/ and
 * app/migrations/20260309110000_seed_paragliding_workflows/.
 */

import { prisma } from './wasp-server-stub.js';

// ---------------------------------------------------------------------------
// Seeded entity IDs
// ---------------------------------------------------------------------------

export const SEED = {
  users: {
    systemAdmin01:  'seed-user-system-admin-01',
    systemAdmin02:  'seed-user-system-admin-02',
    schoolManager01: 'seed-user-school-manager-01',
    schoolManager02: 'seed-user-school-manager-02',
    instructor01:   'seed-user-instructor-01',
    instructor02:   'seed-user-instructor-02',
    student01:      'seed-user-student-01',
    student02:      'seed-user-student-02',
    user01:         'seed-user-user-01',
    user02:         'seed-user-user-02',
  },
  schools: {
    cloudbase: 'seed-school-cloudbase-paragliding',
  },
} as const;

// ---------------------------------------------------------------------------
// Context factory
// The shape { user: { id, role } } is what every operation expects as its
// second argument after Wasp strips the session wrapper.
// ---------------------------------------------------------------------------

type OperationUserRole =
  | 'SYSTEM_ADMIN'
  | 'SCHOOL_MANAGER'
  | 'INSTRUCTOR'
  | 'STUDENT'
  | 'USER';

type OperationContext = {
  user: { id: string; role: OperationUserRole } | null;
};

function makeContext(userId: string, role: OperationUserRole): OperationContext {
  return { user: { id: userId, role } };
}

export const ctx = {
  systemAdmin:  makeContext(SEED.users.systemAdmin01, 'SYSTEM_ADMIN'),
  schoolManager: makeContext(SEED.users.schoolManager01, 'SCHOOL_MANAGER'),
  instructor:   makeContext(SEED.users.instructor01, 'INSTRUCTOR'),
  student:      makeContext(SEED.users.student01, 'STUDENT'),
  user01:       makeContext(SEED.users.user01, 'USER'),
  user02:       makeContext(SEED.users.user02, 'USER'),
  unauthenticated: { user: null } as OperationContext,
} as const;

// ---------------------------------------------------------------------------
// Data cleanup
// Call in beforeEach to start each test with a clean slate.
//
// Safe invariants:
//   - Seeded Users are never deleted or role-changed (except user01/user02
//     which tests may temporarily elevate — they are reset here).
//   - The seeded school (cloudbase) and its UserSchoolRole are preserved.
//   - Everything else written by tests is removed.
// ---------------------------------------------------------------------------

export async function cleanTestData(): Promise<void> {
  // Decisions reference Requests — delete decisions first.
  await prisma.registrationRequestDecision.deleteMany({});
  await prisma.registrationRequest.deleteMany({});

  // Accounts and UserSchoolRoles for non-seed schools created by tests.
  await prisma.userSchoolRole.deleteMany({
    where: { schoolId: { not: SEED.schools.cloudbase } },
  });
  await prisma.account.deleteMany({
    where: { schoolId: { not: SEED.schools.cloudbase } },
  });

  // Schools created by tests (approveSchoolManagerRequest provisions new ones).
  await prisma.school.deleteMany({
    where: { id: { not: SEED.schools.cloudbase } },
  });

  // Reset roles for the plain USER seeds in case a test elevated them.
  await prisma.user.updateMany({
    where: { id: { in: [SEED.users.user01, SEED.users.user02] } },
    data: { role: 'USER' },
  });
}
