/**
 * Course execution — Slice 1 & 2 API tests.
 *
 * Covers:
 *  - startCourse hard guards (INV-01, INV-16, INV-17, INV-18)
 *  - startCourse soft capacity guard (INV-01 soft)
 *  - startCourse success → STARTED lifecycle event
 *  - startCourse idempotent guard (already STARTED → 409)
 *  - closeCourse from STARTED state
 *  - closeCourse blocks COMPLETED courses
 *
 * State machine source: docs/course-state-machine.md §1
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  closeCourse,
  createCourseFromFinalSyllabus,
  assignInstructorToCourse,
  enrollStudentInCourse,
  getManagerStudentsForEnrollment,
  getManagerInstructorsForAssignment,
  reopenCourse,
} from '../../src/areas/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/areas/school-manager/updateSchoolOperations.js';
import { startCourse } from '../../src/course-execution/operations.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED } from './testHelpers.js';
import { CourseLifecycleStatus } from '@prisma/client';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  // Ensure school has a defaultHourlyRate so createCourseFromFinalSyllabus works.
  const school = await prisma.school.findUniqueOrThrow({
    where: { id: SEED.schools.cloudbase },
  });
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
      currency: school.currency,
      defaultHourlyRate: 150,
    },
    ctx.schoolManager,
  );
});

/**
 * Creates a course and returns its id plus the seeded instructor ids
 * so each test can set up exactly the state it needs.
 */
async function createTestCourse(): Promise<{ courseId: string }> {
  return createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID },
    ctx.schoolManager,
  );
}

// ---------------------------------------------------------------------------
// §1 — startCourse guards
// ---------------------------------------------------------------------------

describe('startCourse — auth and scope', () => {
  it('rejects unauthenticated user with 401', async () => {
    const { courseId } = await createTestCourse();
    await expect(startCourse({ courseId }, ctx.unauthenticated)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('rejects non-manager with 403', async () => {
    const { courseId } = await createTestCourse();
    await expect(startCourse({ courseId }, ctx.instructor)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects unknown course with 404', async () => {
    await expect(
      startCourse({ courseId: 'non-existent-id' }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('startCourse — hard guards (INV-01, INV-16, INV-17, INV-18)', () => {
  it('blocks when no instructor is assigned (INV-01)', async () => {
    const { courseId } = await createTestCourse();
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('instructor'),
    });
  });

  it('blocks when instructor has isLead=false and no lead exists (INV-16)', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: false, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('lead instructor'),
    });
  });

  it('blocks when instructor is missing agreedWagePerHour (INV-18)', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true },
      ctx.schoolManager,
    );
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('wage'),
    });
  });

  it('blocks when course hourlyRate is null (INV-17)', async () => {
    // Course table is immutable; create directly with hourlyRate: null to simulate INV-17.
    const course = await prisma.course.create({
      data: {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        schoolId: SEED.schools.cloudbase,
        // hourlyRate intentionally omitted (null)
      },
    });
    const courseId = course.id;
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('hourly rate'),
    });
  });
});

describe('startCourse — soft capacity guard (INV-01 soft)', () => {
  it('blocks when enrolledCount < minCapacity and no override', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID, minCapacity: 5 },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    // 0 students enrolled, minCapacity = 5
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('capacity'),
    });
  });

  it('allows start with overrideCapacity=true even below capacity', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID, minCapacity: 5 },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    const result = await startCourse({ courseId, overrideCapacity: true }, ctx.schoolManager);
    expect(result.status).toBe(CourseLifecycleStatus.STARTED);
  });

  it('allows start when minCapacity is null regardless of enrollment count', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID, minCapacity: null },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    const result = await startCourse({ courseId }, ctx.schoolManager);
    expect(result.status).toBe(CourseLifecycleStatus.STARTED);
  });
});

describe('startCourse — success', () => {
  it('creates a STARTED CourseLifecycleEvent', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await startCourse({ courseId }, ctx.schoolManager);

    const event = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId, status: CourseLifecycleStatus.STARTED },
    });
    expect(event).not.toBeNull();
  });

  it('returns { courseId, status: STARTED }', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    const result = await startCourse({ courseId }, ctx.schoolManager);
    expect(result).toEqual({ courseId, status: CourseLifecycleStatus.STARTED });
  });
});

describe('startCourse — lifecycle state guards', () => {
  it('blocks starting an already-STARTED course with 409', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await startCourse({ courseId }, ctx.schoolManager);
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('already started'),
    });
  });

  it('blocks starting a CLOSED course with 409', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await closeCourse({ courseId }, ctx.schoolManager);
    await expect(startCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('closed'),
    });
  });
});

// ---------------------------------------------------------------------------
// §1 — closeCourse from STARTED + COMPLETED guard
// ---------------------------------------------------------------------------

describe('closeCourse — extended lifecycle paths', () => {
  it('closes a STARTED course directly (STARTED → CLOSED)', async () => {
    const { courseId } = await createTestCourse();
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    await assignInstructorToCourse(
      { courseId, instructorId: instructors[0]!.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await startCourse({ courseId }, ctx.schoolManager);

    const result = await closeCourse({ courseId }, ctx.schoolManager);
    expect(result.status).toBe(CourseLifecycleStatus.CLOSED);

    const lastEvent = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(lastEvent?.status).toBe(CourseLifecycleStatus.CLOSED);
  });

  it('blocks closing a COMPLETED course with 409', async () => {
    const { courseId } = await createTestCourse();
    // Manually inject a COMPLETED event to simulate terminal state.
    await prisma.courseLifecycleEvent.create({
      data: {
        courseId,
        changedByUserId: SEED.users.schoolManager01,
        status: CourseLifecycleStatus.COMPLETED,
      },
    });
    await expect(closeCourse({ courseId }, ctx.schoolManager)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('completed'),
    });
  });
});

// ---------------------------------------------------------------------------
// Regression: existing OPEN → CLOSED → OPEN flow still works
// ---------------------------------------------------------------------------

describe('closeCourse regression (STD-CRS-006)', () => {
  it('OPEN → CLOSED → OPEN still works after schema changes', async () => {
    const { courseId } = await createTestCourse();
    await closeCourse({ courseId }, ctx.schoolManager);
    const afterClose = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(afterClose?.status).toBe(CourseLifecycleStatus.CLOSED);

    await reopenCourse({ courseId }, ctx.schoolManager);
    const afterReopen = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(afterReopen?.status).toBe(CourseLifecycleStatus.REOPENED);
  });
});
