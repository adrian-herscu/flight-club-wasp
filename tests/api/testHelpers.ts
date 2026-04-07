/**
 * Shared test helpers: seeded IDs, context factories, and data cleanup.
 *
 * All IDs below match the deterministic seed migrations under
 * migrations/20260309103000_seed_users_by_role/ and
 * migrations/20260309110000_seed_paragliding_workflows/.
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
  registrationRequests: {
    instructorCloudbase01: 'seed-request-instructor-01-cloudbase',
    instructorCloudbase02: 'seed-request-instructor-02-cloudbase',
    studentCloudbase01:    'seed-request-student-01-cloudbase',
    studentCloudbase02:    'seed-request-student-02-cloudbase',
  },
} as const;

// ---------------------------------------------------------------------------
// Context factory
// The shape { user: { id, isSystemAdmin } } is what every operation expects as
// its second argument after Wasp strips the session wrapper.
// School-level role checks (SCHOOL_MANAGER, INSTRUCTOR, STUDENT) are now
// authoritative from the UserSchoolRole table, not from the context object.
// ---------------------------------------------------------------------------

type OperationContext = {
  user: { id: string; isSystemAdmin: boolean } | null;
};

function makeContext(userId: string, isSystemAdmin: boolean): OperationContext {
  return { user: { id: userId, isSystemAdmin } };
}

export const ctx = {
  systemAdmin:   makeContext(SEED.users.systemAdmin01, true),
  schoolManager: makeContext(SEED.users.schoolManager01, false),
  instructor:    makeContext(SEED.users.instructor01, false),
  student:       makeContext(SEED.users.student01, false),
  user01:        makeContext(SEED.users.user01, false),
  user02:        makeContext(SEED.users.user02, false),
  unauthenticated: { user: null } as OperationContext,
} as const;

// ---------------------------------------------------------------------------
// Data cleanup
// Call in beforeEach to start each test with a clean slate.
//
// Safe invariants:
//   - Seeded Users are never deleted.
//   - The seeded school (cloudbase) and its UserSchoolRole are preserved.
//   - Seeded member RegistrationRequests (and their decisions) are preserved.
//   - Everything else written by tests is removed.
// ---------------------------------------------------------------------------

const SEEDED_REGISTRATION_REQUEST_IDS = Object.values(SEED.registrationRequests);

export async function cleanTestData(): Promise<void> {
  // Decisions reference Requests — delete decisions first.
  // Preserve decisions that belong to seeded registration requests.
  await prisma.registrationRequestDecision.deleteMany({
    where: { requestId: { notIn: SEEDED_REGISTRATION_REQUEST_IDS } },
  });
  await prisma.registrationRequest.deleteMany({
    where: { id: { notIn: SEEDED_REGISTRATION_REQUEST_IDS } },
  });

  // Accounts and UserSchoolRoles for non-seed schools created by tests.
  await prisma.userSchoolRole.deleteMany({
    where: { schoolId: { not: SEED.schools.cloudbase } },
  });
  // Account and School rows are protected by DB-level append-only triggers in
  // this test environment. Keep cleanup focused on mutable approval artifacts.
}
