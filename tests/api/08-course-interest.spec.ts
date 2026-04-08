import { beforeAll, describe, expect, it } from 'vitest';

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
import { prisma } from './wasp-server-stub.js';
import {
  ctx,
  createIsolatedSchoolManager,
  createTestUser,
  type IsolatedSchoolManager,
} from './testHelpers.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

// ---------------------------------------------------------------------------
// Isolated test state
// ---------------------------------------------------------------------------

let mgr: IsolatedSchoolManager;

beforeAll(async () => {
  mgr = await createIsolatedSchoolManager();
  await prisma.school.update({
    where: { id: mgr.school.id },
    data: { defaultHourlyRate: 150 },
  });
});

async function createTestCourse(): Promise<string> {
  const result = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID },
    mgr.user.ctx,
  ) as { courseId: string };
  return result.courseId;
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('8 course interest flow (API)', () => {
  describe('expressInterestInCourse', () => {
    it('[STD-CIN-001] creates a CourseInterest(INTERESTED) record for a logged-in user', async () => {
      const student = await createTestUser();
      const courseId = await createTestCourse();

      const result = await expressInterestInCourse(
        { courseId },
        student.ctx,
      ) as { id: string; status: string };

      expect(result.id).toBeTruthy();
      expect(result.status).toBe('INTERESTED');

      const record = await prisma.courseInterest.findUnique({
        where: { courseId_userId: { courseId, userId: student.id } },
        select: { status: true },
      });
      expect(record?.status).toBe('INTERESTED');
    });

    it('[STD-CIN-002] is idempotent — re-expressing interest on INTERESTED returns same status', async () => {
      const student = await createTestUser();
      const courseId = await createTestCourse();

      const first = await expressInterestInCourse({ courseId }, student.ctx) as { id: string; status: string };
      const second = await expressInterestInCourse({ courseId }, student.ctx) as { id: string; status: string };

      expect(first.id).toBe(second.id);
      expect(second.status).toBe('INTERESTED');

      const count = await prisma.courseInterest.count({
        where: { courseId, userId: student.id },
      });
      expect(count).toBe(1);
    });

    it('[STD-CIN-008] returns 401 for unauthenticated user', async () => {
      const courseId = await createTestCourse();

      await expectHttpError(
        expressInterestInCourse({ courseId }, ctx.unauthenticated),
        401,
        'You must be logged in to express interest in a course.',
      );
    });

    it('returns 404 for unknown course id', async () => {
      const student = await createTestUser();

      await expectHttpError(
        expressInterestInCourse({ courseId: 'non-existent-course-id' }, student.ctx),
        404,
        'Course not found.',
      );
    });
  });

  describe('cancelMyCourseInterest', () => {
    it('[STD-CIN-013] student can cancel a pre-enrollment interest', async () => {
      const student = await createTestUser();
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, student.ctx) as { id: string };

      const result = await cancelMyCourseInterest({ interestId: interest.id }, student.ctx) as {
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
      const student = await createTestUser();
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, student.ctx) as { id: string };

      await cancelMyCourseInterest({ interestId: interest.id }, student.ctx);

      const reopened = await expressInterestInCourse({ courseId }, student.ctx) as {
        id: string;
        status: string;
      };

      expect(reopened.id).toBe(interest.id);
      expect(reopened.status).toBe('INTERESTED');
    });
  });

  describe('getMyInterests', () => {
    it('returns a list of interests for the authenticated user', async () => {
      const student = await createTestUser();
      const result = await getMyInterests(undefined, student.ctx) as unknown[];
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns CourseInterest records with course title and school name', async () => {
      const student = await createTestUser();
      const courseId = await createTestCourse();
      await expressInterestInCourse({ courseId }, student.ctx);

      const result = await getMyInterests(undefined, student.ctx) as {
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
      const student = await createTestUser();
      const courseId = await createTestCourse();
      await expressInterestInCourse({ courseId }, student.ctx);

      const result = await getManagerCourseInterests(
        { schoolId: mgr.school.id, courseId },
        mgr.user.ctx,
      ) as { id: string; status: string; user: { id: string } }[];

      const relevant = result.filter((r) => r.user.id === student.id);
      expect(relevant.length).toBe(1);
      expect(relevant[0].status).toBe('INTERESTED');
    });

    it('[STD-CIN-009] returns 403 for non-manager user', async () => {
      const student = await createTestUser();

      await expectHttpError(
        getManagerCourseInterests({ courseId: null }, student.ctx),
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
      const student = await createTestUser();
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, student.ctx) as { id: string };

      await cancelCourseInterestForManager(
        { schoolId: mgr.school.id, interestId: interest.id },
        mgr.user.ctx,
      );

      const result = await getManagerCourseInterests(
        { schoolId: mgr.school.id, courseId },
        mgr.user.ctx,
      ) as { id: string }[];

      expect(result.some((item) => item.id === interest.id)).toBe(false);
    });

    it('[STD-CIN-007] excludes enrolled interests from the manager actionable interests list', async () => {
      const student = await createTestUser();
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, student.ctx) as { id: string };

      await approveStudentEnrollmentFromInterest(
        { schoolId: mgr.school.id, interestId: interest.id },
        mgr.user.ctx,
      );

      const result = await getManagerCourseInterests(
        { schoolId: mgr.school.id, courseId },
        mgr.user.ctx,
      ) as { id: string }[];

      expect(result.some((item) => item.id === interest.id)).toBe(false);
    });
  });

  describe('cancelCourseInterestForManager', () => {
    it('[STD-CIN-015] manager can cancel a pending course interest in school scope', async () => {
      const student = await createTestUser();
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, student.ctx) as { id: string };

      const result = await cancelCourseInterestForManager(
        { schoolId: mgr.school.id, interestId: interest.id },
        mgr.user.ctx,
      ) as { id: string; status: string };

      expect(result.status).toBe('CANCELLED');
    });
  });
});
