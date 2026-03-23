import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  closeCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerClosedCourses,
  getManagerCoursesForEnrollment,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
  reopenCourse,
} from '../../app/src/school-manager/operations';
import { updateMyManagedSchool } from '../../app/src/school-manager/updateSchoolOperations';
import { prisma } from '../src/wasp-server-stub.js';
import { ctx, SEED } from '../src/testHelpers';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';

describe('4.8 course close/reopen lifecycle (API)', () => {
  beforeEach(async () => {
    const school = await prisma.school.findUnique({
      where: { id: SEED.schools.cloudbase },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        phone: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateProvince: true,
        postalCode: true,
        currency: true,
      },
    });

    if (!school) {
      throw new Error('Seed school not found.');
    }

    await updateMyManagedSchool(
      {
        schoolId: school.id,
        name: school.name,
        websiteUrl: school.websiteUrl ?? '',
        phone: school.phone ?? '',
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

    await prisma.account.upsert({
      where: {
        userId_schoolId: {
          userId: SEED.users.student01,
          schoolId: school.id,
        },
      },
      update: {},
      create: {
        userId: SEED.users.student01,
        schoolId: school.id,
        currency: school.currency,
      },
    });

    await prisma.account.upsert({
      where: {
        userId_schoolId: {
          userId: SEED.users.instructor01,
          schoolId: school.id,
        },
      },
      update: {},
      create: {
        userId: SEED.users.instructor01,
        schoolId: school.id,
        currency: school.currency,
      },
    });
  });

  it('[STD-CRS-006] manager can close and reopen a course', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-01T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    await closeCourse({ courseId: created.courseId }, ctx.schoolManager);

    const openCoursesAfterClose = await getManagerCoursesForEnrollment({}, ctx.schoolManager);
    const closedCoursesAfterClose = await getManagerClosedCourses({}, ctx.schoolManager);

    expect(openCoursesAfterClose.some((course) => course.courseId === created.courseId)).toBe(false);
    expect(closedCoursesAfterClose.some((course) => course.courseId === created.courseId)).toBe(true);

    await reopenCourse({ courseId: created.courseId }, ctx.schoolManager);

    const openCoursesAfterReopen = await getManagerCoursesForEnrollment({}, ctx.schoolManager);
    const closedCoursesAfterReopen = await getManagerClosedCourses({}, ctx.schoolManager);

    expect(openCoursesAfterReopen.some((course) => course.courseId === created.courseId)).toBe(true);
    expect(closedCoursesAfterReopen.some((course) => course.courseId === created.courseId)).toBe(false);
  });

  it('[STD-CRS-007] enrollment and assignment are blocked for closed courses', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-02T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);

    if (!students.length || !instructors.length) {
      throw new Error('Expected seeded students and instructors in manager scope.');
    }

    await closeCourse({ courseId: created.courseId }, ctx.schoolManager);

    await expect(
      enrollStudentInCourse(
        {
          courseId: created.courseId,
          studentId: students[0]?.studentId,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Course is closed and cannot accept new enrollments.',
    });

    await expect(
      assignInstructorToCourse(
        {
          courseId: created.courseId,
          instructorId: instructors[0]?.instructorId,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Course is closed and cannot accept new instructor assignments.',
    });
  });
});
