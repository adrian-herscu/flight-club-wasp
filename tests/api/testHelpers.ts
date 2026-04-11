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

type AuthenticatedOperationContext = {
  user: { id: string; isSystemAdmin: boolean };
};

function makeContext(userId: string, isSystemAdmin: boolean): AuthenticatedOperationContext {
  return { user: { id: userId, isSystemAdmin } };
}

type TestContextMap = {
  systemAdmin: AuthenticatedOperationContext;
  schoolManager: AuthenticatedOperationContext;
  instructor: AuthenticatedOperationContext;
  student: AuthenticatedOperationContext;
  user01: AuthenticatedOperationContext;
  user02: AuthenticatedOperationContext;
  unauthenticated: OperationContext;
};

export const ctx: TestContextMap = {
  systemAdmin:   makeContext(SEED.users.systemAdmin01, true),
  schoolManager: makeContext(SEED.users.schoolManager01, false),
  instructor:    makeContext(SEED.users.instructor01, false),
  student:       makeContext(SEED.users.student01, false),
  user01:        makeContext(SEED.users.user01, false),
  user02:        makeContext(SEED.users.user02, false),
  unauthenticated: { user: null },
};

type IsolatedMember = {
  userId: string;
  profileId: string;
  accountId: string;
  ctx: AuthenticatedOperationContext;
};

export type IsolatedCourseMembers = {
  instructor1: IsolatedMember;
  instructor2: IsolatedMember;
  student1: IsolatedMember;
  student2: IsolatedMember;
};

const isolatedCourseMemberCache = new Map<string, Promise<IsolatedCourseMembers>>();

function normalizeScope(scope: string): string {
  return scope.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
}

async function ensureIsolatedCourseMembers(scope: string): Promise<IsolatedCourseMembers> {
  const key = normalizeScope(scope);

  const school = await prisma.school.findUniqueOrThrow({
    where: { id: SEED.schools.cloudbase },
    select: { id: true, currency: true },
  });

  const mkIds = (label: string) => {
    const base = `api-${key}-${label}`;
    return {
      userId: `${base}-user`,
      profileId: `${base}-profile`,
      accountId: `${base}-account`,
      email: `${base}@example.test`,
      fullName: `${key} ${label}`,
    };
  };

  const instructor1Ids = mkIds('instructor-01');
  const instructor2Ids = mkIds('instructor-02');
  const student1Ids = mkIds('student-01');
  const student2Ids = mkIds('student-02');

  for (const ids of [instructor1Ids, instructor2Ids, student1Ids, student2Ids]) {
    await prisma.user.upsert({
      where: { id: ids.userId },
      update: {
        email: ids.email,
        fullName: ids.fullName,
        isSystemAdmin: false,
      },
      create: {
        id: ids.userId,
        email: ids.email,
        fullName: ids.fullName,
        isSystemAdmin: false,
      },
    });
  }

  await prisma.instructor.upsert({
    where: { userId: instructor1Ids.userId },
    update: {},
    create: { id: instructor1Ids.profileId, userId: instructor1Ids.userId },
  });
  await prisma.instructor.upsert({
    where: { userId: instructor2Ids.userId },
    update: {},
    create: { id: instructor2Ids.profileId, userId: instructor2Ids.userId },
  });
  await prisma.student.upsert({
    where: { userId: student1Ids.userId },
    update: {},
    create: { id: student1Ids.profileId, userId: student1Ids.userId },
  });
  await prisma.student.upsert({
    where: { userId: student2Ids.userId },
    update: {},
    create: { id: student2Ids.profileId, userId: student2Ids.userId },
  });

  for (const ids of [instructor1Ids, instructor2Ids, student1Ids, student2Ids]) {
    const existingAccount = await prisma.account.findUnique({
      where: {
        userId_schoolId: {
          userId: ids.userId,
          schoolId: school.id,
        },
      },
      select: { id: true },
    });

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          id: ids.accountId,
          userId: ids.userId,
          schoolId: school.id,
          currency: school.currency,
        },
      });
    }
  }

  return {
    instructor1: {
      userId: instructor1Ids.userId,
      profileId: instructor1Ids.profileId,
      accountId: instructor1Ids.accountId,
      ctx: makeContext(instructor1Ids.userId, false) as AuthenticatedOperationContext,
    },
    instructor2: {
      userId: instructor2Ids.userId,
      profileId: instructor2Ids.profileId,
      accountId: instructor2Ids.accountId,
      ctx: makeContext(instructor2Ids.userId, false) as AuthenticatedOperationContext,
    },
    student1: {
      userId: student1Ids.userId,
      profileId: student1Ids.profileId,
      accountId: student1Ids.accountId,
      ctx: makeContext(student1Ids.userId, false) as AuthenticatedOperationContext,
    },
    student2: {
      userId: student2Ids.userId,
      profileId: student2Ids.profileId,
      accountId: student2Ids.accountId,
      ctx: makeContext(student2Ids.userId, false) as AuthenticatedOperationContext,
    },
  };
}

export async function useIsolatedCourseMembers(scope: string): Promise<IsolatedCourseMembers> {
  const cacheKey = normalizeScope(scope);
  let membersPromise = isolatedCourseMemberCache.get(cacheKey);
  if (!membersPromise) {
    membersPromise = ensureIsolatedCourseMembers(cacheKey);
    isolatedCourseMemberCache.set(cacheKey, membersPromise);
  }
  const members = await membersPromise;

  return members;
}

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
