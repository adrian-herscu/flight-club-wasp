import { beforeEach, describe, expect, it } from 'vitest';

import {
  expressInterestInCourse,
  getMyInterests,
} from '../../src/portal/student/operations.js';
import {
  advanceCourseInterestToContacted,
  getManagerCourseInterests,
  createCourseFromFinalSyllabus,
} from '../../src/school-manager/operations.js';
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
  const result = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID },
    ctx.schoolManager,
  ) as { courseId: string };
  return result.courseId;
}

async function cleanInterests(): Promise<void> {
  await prisma.courseInterest.deleteMany({
    where: {
      userId: { in: [SEED.users.student01, SEED.users.student02, SEED.users.user01] },
    },
  });
}

async function cleanTestCourses(): Promise<void> {
  // Remove only non-seeded courses created by tests for the cloudbase school
  const SEEDED_COURSE_IDS = [
    'seed-course-tandem-qualification-01',
    'seed-course-paragliding-intro-2027-01',
    'seed-course-lifecycle-e2e-cloudbase',
    'seed-course-lifecycle-e2e-annex',
  ];

  await prisma.courseInterest.deleteMany({
    where: {
      course: {
        schoolId: SEED.schools.cloudbase,
        id: { notIn: SEEDED_COURSE_IDS },
      },
    },
  });
  await prisma.courseLifecycleEvent.deleteMany({
    where: {
      course: {
        schoolId: SEED.schools.cloudbase,
        id: { notIn: SEEDED_COURSE_IDS },
      },
    },
  });
  await prisma.course.deleteMany({
    where: {
      schoolId: SEED.schools.cloudbase,
      id: { notIn: SEEDED_COURSE_IDS },
    },
  });
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
    it('creates a CourseInterest(INTERESTED) record for a logged-in user', async () => {
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

    it('is idempotent — re-expressing interest on INTERESTED returns same status', async () => {
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

    it('re-opens a CANCELLED interest back to INTERESTED', async () => {
      const courseId = await createTestCourse();
      const created = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      await prisma.courseInterest.update({
        where: { id: created.id },
        data: { status: 'CANCELLED' },
      });

      const result = await expressInterestInCourse({ courseId }, ctx.student) as { status: string };
      expect(result.status).toBe('INTERESTED');
    });

    it('returns 401 for unauthenticated user', async () => {
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

  describe('getMyInterests', () => {
    it('returns an empty list when the user has no interests', async () => {
      const result = await getMyInterests(undefined, ctx.student) as unknown[];
      expect(result).toEqual([]);
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
    it('returns INTERESTED records for the managed school', async () => {
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

    it('returns 403 for non-manager user', async () => {
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

  describe('advanceCourseInterestToContacted', () => {
    it('advances INTERESTED to CONTACTED', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      const result = await advanceCourseInterestToContacted(
        { schoolId: SEED.schools.cloudbase, interestId: interest.id },
        ctx.schoolManager,
      ) as { id: string; status: string };

      expect(result.status).toBe('CONTACTED');

      const record = await prisma.courseInterest.findUnique({
        where: { id: interest.id },
        select: { status: true },
      });
      expect(record?.status).toBe('CONTACTED');
    });

    it('returns 409 when interest is already CONTACTED', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };
      await advanceCourseInterestToContacted(
        { schoolId: SEED.schools.cloudbase, interestId: interest.id },
        ctx.schoolManager,
      );

      await expectHttpError(
        advanceCourseInterestToContacted(
          { schoolId: SEED.schools.cloudbase, interestId: interest.id },
          ctx.schoolManager,
        ),
        409,
        'Only INTERESTED records can be advanced to CONTACTED.',
      );
    });

    it('returns 404 when interest does not belong to the managed school', async () => {
      const courseId = await createTestCourse();
      const interest = await expressInterestInCourse({ courseId }, ctx.student) as { id: string };

      // schoolManager02 manages the cloudbase-annex school — not the school this
      // course belongs to, so the interest is out-of-scope.
      const ctxManager02 = { user: { id: SEED.users.schoolManager02, isSystemAdmin: false } };
      await expectHttpError(
        advanceCourseInterestToContacted(
          { interestId: interest.id },
          ctxManager02,
        ),
        404,
        'Course interest not found in your school scope.',
      );
    });

    it('returns 404 for unknown interest id', async () => {
      await expectHttpError(
        advanceCourseInterestToContacted(
          { schoolId: SEED.schools.cloudbase, interestId: 'non-existent-interest-id' },
          ctx.schoolManager,
        ),
        404,
        'Course interest not found in your school scope.',
      );
    });

    it('returns 403 for non-manager user', async () => {
      await expectHttpError(
        advanceCourseInterestToContacted(
          { interestId: 'some-id' },
          ctx.student,
        ),
        403,
        'Only school managers can access this resource.',
      );
    });

    it('returns 401 for unauthenticated user', async () => {
      await expectHttpError(
        advanceCourseInterestToContacted(
          { interestId: 'some-id' },
          ctx.unauthenticated,
        ),
        401,
        'Only authenticated users can access manager features.',
      );
    });
  });
});
