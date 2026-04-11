import { beforeEach, describe, expect, it } from 'vitest';

import {
  cancelMyCourseInterest,
  expressInterestInCourse,
  getMyInterests,
} from '../../src/portal/student/operations.js';
import {
  approveStudentEnrollmentFromInterest,
  cancelCourseInterestForManager,
  getManagerCourseInterests,
  createCourseFromFinalSyllabus,
} from '../../src/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/school-manager/updateSchoolOperations.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED } from './testHelpers.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HttpErrorShape = { statusCode: number; message: string };

async function expectHttpError(
  promise: Promise<unknown>,
  expectedStatusCode: number,
  expectedMessage: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    statusCode: expectedStatusCode,
    message: expectedMessage,
  } satisfies HttpErrorShape);
}

async function createTestCourse(): Promise<string> {
  // Ensure the school has a default hourly rate set
  const school = await prisma.school.findUnique({
    where: { id: SEED.schools.cloudbase },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      logoUrl: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateProvince: true,
      postalCode: true,
    },
  });

  if (!school) {
    throw new Error('School not found');
  }

  await updateMyManagedSchool(
    {
      schoolId: school.id,
      name: school.name,
      websiteUrl: school.websiteUrl ?? '',
      logoUrl: school.logoUrl ?? '',
      addressLine1: school.addressLine1,
      addressLine2: school.addressLine2 ?? '',
      city: school.city,
      stateProvince: school.stateProvince ?? '',
      postalCode: school.postalCode,
      defaultHourlyRate: 150,
    },
    ctx.schoolManager,
  );

  const result = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID, hourlyRate: 150 },
    ctx.schoolManager,
  ) as { courseId: string };
  return result.courseId;
}

async function cleanInterests(): Promise<void> {
  // Note: CourseInterest table has delete triggers that prevent deletion.
  // Tests work with isolation; each test creates its own course.
}

async function cleanTestCourses(): Promise<void> {
  // Note: Course, SyllabusLesson, and other tables have delete triggers that prevent deletion.
  // Tests rely on time-based isolation; each test creates its own course via createCourseFromFinalSyllabus().
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('8 course interest flow (API)', () => {
  beforeEach(async () => {
    await cleanInterests();
    await cleanTestCourses();
  });

  describe('expressInterestInCourse', () => {
    it('[STD-CIN-001] creates a CourseInterest(INTERESTED) record for a logged-in user', async () => {
      const courseId = await createTestCourse();

      const result = await expressInterestInCourse(
        { courseId },
        ctx.student,
      ) as { id: string; status: string };

      expect(result.id).toBeTruthy();
      expect(result.status).toBe('INTERESTED');

      const record = await prisma.courseInterest.findUnique({
        where: { courseId_userId: { courseId, userId: SEED.users.student01 } },
        select: { status: true },
      });
      expect(record?.status).toBe('INTERESTED');
    });

    it('[STD-CIN-002] is idempotent — re-expressing interest on INTERESTED returns same status', async () => {
      const courseId = await createTestCourse();

      const first = await expressInterestInCourse({ courseId }, ctx.student) as { id: string; status: string };
      const second = await expressInterestInCourse({ courseId }, ctx.student) as { id: string; status: string };

      expect(first.id).toBe(second.id);
      expect(second.status).toBe('INTERESTED');

      const count = await prisma.courseInterest.count({
        where: { courseId, userId: SEED.users.student01 },
      });
      expect(count).toBe(1);
    });

    // Note: re-opening from CANCELLED is idempotent but requires pre-existing CANCELLED record.
    // Cannot test directly because CourseInterest table has immutability triggers.
    // This edge case is covered by the "is idempotent" test which covers the primary use case.

    it('[STD-CIN-008] returns 401 for unauthenticated user', async () => {
      const courseId = await createTestCourse();

      await expectHttpError(
        expressInterestInCourse({ courseId }, ctx.unauthenticated),
        401,
        'You must be logged in to express interest in a course.',
      );
    });

    it('returns 404 for unknown course id', async () => {
      await expectHttpError(
        expressInterestInCourse({ courseId: 'non-existent-course-id' }, ctx.student),
        404,
        'Course not found.',
      );
    });
  });

  describe('cancelMyCourseInterest', () => {
    it('[STD-CIN-013] student can cancel a pre-enrollment interest', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      const result = await cancelMyCourseInterest({ interestId: interest.id }, ctx.student) as {
        id: string;
        status: string;
      };

      expect(result.status).toBe('CANCELLED');

      const record = await prisma.courseInterest.findUnique({
        where: { id: interest.id },
        select: { status: true },
      });
      expect(record?.status).toBe('CANCELLED');
    });

    it('[STD-CIN-014] cancelled interest can be re-opened by expressing interest again', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      await cancelMyCourseInterest({ interestId: interest.id }, ctx.student);

      const reopened = await expressInterestInCourse({ courseId }, ctx.student) as {
        id: string;
        status: string;
      };

      expect(reopened.id).toBe(interest.id);
      expect(reopened.status).toBe('INTERESTED');
    });
  });

  describe('getMyInterests', () => {
    it('returns a list of interests (may include previous test data)', async () => {
      const result = await getMyInterests(undefined, ctx.student) as unknown[];
      // With immutability triggers, tests can't delete interests, so the list
      // may contain records from previous test runs. Just verify it's an array.
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns CourseInterest records with course title and school name', async () => {
      const courseId = await createTestCourse();
      await expressInterestInCourse({ courseId }, ctx.student);

      const result = await getMyInterests(undefined, ctx.student) as {
        id: string;
        status: string;
        course: { id: string; title: string; schoolName: string | null };
      }[];

      expect(result.length).toBeGreaterThanOrEqual(1);
      const mine = result.find((r) => r.course.id === courseId);
      expect(mine).toBeDefined();
      expect(mine?.status).toBe('INTERESTED');
      expect(mine?.course.title).toBeTruthy();
    });

    it('returns 401 for unauthenticated user', async () => {
      await expectHttpError(
        getMyInterests(undefined, ctx.unauthenticated),
        401,
        'You must be logged in to view your interests.',
      );
    });
  });

  describe('getManagerCourseInterests', () => {
    it('[STD-CIN-005] returns INTERESTED records for the managed school', async () => {
      const courseId = await createTestCourse();
      await expressInterestInCourse({ courseId }, ctx.student);

      const result = await getManagerCourseInterests(
        { schoolId: SEED.schools.cloudbase, courseId },
        ctx.schoolManager,
      ) as { id: string; status: string; user: { id: string } }[];

      const relevant = result.filter((r) => r.user.id === SEED.users.student01);
      expect(relevant.length).toBe(1);
      expect(relevant[0].status).toBe('INTERESTED');
    });

    it('[STD-CIN-009] returns 403 for non-manager user', async () => {
      await expectHttpError(
        getManagerCourseInterests({ courseId: null }, ctx.student),
        403,
        'Only school managers can access this resource.',
      );
    });

    it('returns 401 for unauthenticated user', async () => {
      await expectHttpError(
        getManagerCourseInterests({ courseId: null }, ctx.unauthenticated),
        401,
        'Only authenticated users can access manager features.',
      );
    });
  });


  describe('getManagerCourseInterests lifecycle filtering', () => {
    it('[STD-CIN-006] excludes cancelled interests from the manager actionable interests list', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      await cancelCourseInterestForManager(
        { schoolId: SEED.schools.cloudbase, interestId: interest.id },
        ctx.schoolManager,
      );

      const result = await getManagerCourseInterests(
        { schoolId: SEED.schools.cloudbase, courseId },
        ctx.schoolManager,
      ) as { id: string }[];

      expect(result.some((item) => item.id === interest.id)).toBe(false);
    });

    it('[STD-CIN-007] excludes enrolled interests from the manager actionable interests list', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      await approveStudentEnrollmentFromInterest(
        { schoolId: SEED.schools.cloudbase, interestId: interest.id },
        ctx.schoolManager,
      );

      const result = await getManagerCourseInterests(
        { schoolId: SEED.schools.cloudbase, courseId },
        ctx.schoolManager,
      ) as { id: string }[];

      expect(result.some((item) => item.id === interest.id)).toBe(false);
    });
  });

  describe('cancelCourseInterestForManager', () => {
    it('[STD-CIN-015] manager can cancel a pending course interest in school scope', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      const result = await cancelCourseInterestForManager(
        { schoolId: SEED.schools.cloudbase, interestId: interest.id },
        ctx.schoolManager,
      ) as { id: string; status: string };

      expect(result.status).toBe('CANCELLED');
    });
  });
});
