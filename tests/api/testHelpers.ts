/**
 * Shared test helpers: seeded IDs, context factories, and data factories.
 *
 * ## Design principles
 *
 * Each test file calls createIsolatedSchoolManager() (or similar factories)
 * in beforeAll to provision its own school manager user + school. Tests never
 * share mutable state — the seeded cloudbase school and its users are
 * read-only reference data used only for auth context verification.
 *
 * This allows fileParallelism: true — test files run concurrently without
 * interfering with each other.
 *
 * ## Seeded data (read-only, do not mutate in tests)
 *
 * All IDs below match the deterministic seed migrations under
 * migrations/20260309103000_seed_users_by_role/ and
 * migrations/20260309110000_seed_paragliding_workflows/.
 */

import { randomUUID } from 'node:crypto';
import { SchoolRole } from '@prisma/client';
import { prisma } from './wasp-server-stub.js';

// ---------------------------------------------------------------------------
// Seeded entity IDs — used only as auth context, never as data targets
// ---------------------------------------------------------------------------

export const SEED = {
  users: {
    systemAdmin01:   'seed-user-system-admin-01',
    systemAdmin02:   'seed-user-system-admin-02',
    schoolManager01: 'seed-user-school-manager-01',
    schoolManager02: 'seed-user-school-manager-02',
    instructor01:    'seed-user-instructor-01',
    instructor02:    'seed-user-instructor-02',
    student01:       'seed-user-student-01',
    student02:       'seed-user-student-02',
    user01:          'seed-user-user-01',
    user02:          'seed-user-user-02',
  },
  schools: {
    cloudbase: 'seed-school-cloudbase-paragliding',
  },
  syllabusVersions: {
    tandemFlightsV1: 'seed-syllabus-version-tandem-flights-v1',
  },
} as const;

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

type OperationContext = {
  user: { id: string; isSystemAdmin: boolean } | null;
};

function makeContext(userId: string, isSystemAdmin: boolean): OperationContext {
  return { user: { id: userId, isSystemAdmin } };
}

export const ctx = {
  systemAdmin:     makeContext(SEED.users.systemAdmin01, true),
  schoolManager:   makeContext(SEED.users.schoolManager01, false),
  instructor:      makeContext(SEED.users.instructor01, false),
  student:         makeContext(SEED.users.student01, false),
  user01:          makeContext(SEED.users.user01, false),
  user02:          makeContext(SEED.users.user02, false),
  unauthenticated: { user: null } as OperationContext,
} as const;

// ---------------------------------------------------------------------------
// Unique ID helper
// ---------------------------------------------------------------------------

/** Returns a short unique suffix safe for use in names and IDs. */
export function uid(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Data factories
// Each factory creates a uniquely-named entity so tests never collide.
// ---------------------------------------------------------------------------

export type TestUser = {
  id: string;
  email: string;
  ctx: OperationContext;
};

/** Creates a plain authenticated user with no school roles. */
export async function createTestUser(): Promise<TestUser> {
  const id = `test-user-${uid()}`;
  const email = `${uid()}@test.example`;
  await prisma.user.create({
    data: { id, email, isSystemAdmin: false },
  });
  return { id, email, ctx: makeContext(id, false) };
}

export type TestSchool = {
  id: string;
  name: string;
  currency: string;
};

export type IsolatedSchoolManager = {
  user: TestUser;
  school: TestSchool;
};

/**
 * Creates a self-contained school manager: a new User, a new School, and a
 * SCHOOL_MANAGER UserSchoolRole + Account. The returned ctx scopes all
 * school-manager operations to this school.
 */
export async function createIsolatedSchoolManager(): Promise<IsolatedSchoolManager> {
  const suffix = uid();
  const userId = `test-mgr-${suffix}`;
  const schoolId = `test-school-${suffix}`;
  const email = `manager-${suffix}@test.example`;
  const currency = 'USD';

  await prisma.user.create({
    data: { id: userId, email, isSystemAdmin: false },
  });

  await prisma.school.create({
    data: {
      id: schoolId,
      name: `Test School ${suffix}`,
      addressLine1: '1 Test St',
      city: 'Testville',
      postalCode: '00000',
      country: 'US',
      currency,
      adminId: userId,
    },
  });

  await prisma.account.create({
    data: { userId, schoolId, currency },
  });

  await prisma.userSchoolRole.create({
    data: {
      userId,
      schoolId,
      role: SchoolRole.SCHOOL_MANAGER,
      grantedByUserId: SEED.users.systemAdmin01,
    },
  });

  const user: TestUser = { id: userId, email, ctx: makeContext(userId, false) };
  const school: TestSchool = { id: schoolId, name: `Test School ${suffix}`, currency };
  return { user, school };
}

export type TestStudent = {
  userId: string;
  studentId: string;
  email: string;
  ctx: OperationContext;
};

/**
 * Creates a User + Student profile + Account at the given school.
 * Also grants the STUDENT UserSchoolRole.
 */
export async function createTestStudent(schoolId: string, currency: string): Promise<TestStudent> {
  const suffix = uid();
  const userId = `test-student-${suffix}`;
  const email = `student-${suffix}@test.example`;

  await prisma.user.create({
    data: { id: userId, email, isSystemAdmin: false },
  });

  const { id: studentId } = await prisma.student.create({
    data: { userId },
    select: { id: true },
  });

  await prisma.account.create({
    data: { userId, schoolId, currency },
  });

  await prisma.userSchoolRole.create({
    data: {
      userId,
      schoolId,
      role: SchoolRole.STUDENT,
      grantedByUserId: SEED.users.systemAdmin01,
    },
  });

  return { userId, studentId, email, ctx: makeContext(userId, false) };
}

export type TestInstructor = {
  userId: string;
  instructorId: string;
  email: string;
  ctx: OperationContext;
};

/**
 * Creates a User + Instructor profile + Account at the given school.
 * Also grants the INSTRUCTOR UserSchoolRole.
 */
export async function createTestInstructor(schoolId: string, currency: string): Promise<TestInstructor> {
  const suffix = uid();
  const userId = `test-instructor-${suffix}`;
  const email = `instructor-${suffix}@test.example`;

  await prisma.user.create({
    data: { id: userId, email, isSystemAdmin: false },
  });

  const { id: instructorId } = await prisma.instructor.create({
    data: { userId },
    select: { id: true },
  });

  await prisma.account.create({
    data: { userId, schoolId, currency },
  });

  // The DB trigger requires sourceRegistrationRequestId for INSTRUCTOR roles.
  const { id: requestId } = await prisma.registrationRequest.create({
    data: {
      requesterId: userId,
      requestedRole: 'INSTRUCTOR',
      targetSchoolId: schoolId,
      approvedSchoolId: schoolId,
      status: 'APPROVED',
      reviewerId: SEED.users.systemAdmin01,
      reviewedAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.userSchoolRole.create({
    data: {
      userId,
      schoolId,
      role: SchoolRole.INSTRUCTOR,
      grantedByUserId: SEED.users.systemAdmin01,
      sourceRegistrationRequestId: requestId,
    },
  });

  return { userId, instructorId, email, ctx: makeContext(userId, false) };
}

/**
 * Adds a second isolated school for an existing manager user.
 * Useful when a test needs one manager to manage multiple schools.
 */
export async function addIsolatedSchoolToManager(userId: string): Promise<TestSchool> {
  const suffix = uid();
  const schoolId = `test-school-${suffix}`;
  const currency = 'USD';

  await prisma.school.create({
    data: {
      id: schoolId,
      name: `Test School ${suffix}`,
      addressLine1: '1 Test St',
      city: 'Testville',
      postalCode: '00000',
      country: 'US',
      currency,
      adminId: userId,
    },
  });

  await prisma.account.create({
    data: { userId, schoolId, currency },
  });

  await prisma.userSchoolRole.create({
    data: {
      userId,
      schoolId,
      role: SchoolRole.SCHOOL_MANAGER,
      grantedByUserId: SEED.users.systemAdmin01,
    },
  });

  return { id: schoolId, name: `Test School ${suffix}`, currency };
}
