import { beforeEach, describe, expect, it } from 'vitest';

import { expressInterestInCourse } from '../../src/portal/student/operations.js';
import {
  approveStudentEnrollmentFromInterest,
  getManagerStudentCoursePairs,
} from '../../src/school-manager/operations.js';
import { cleanTestData, ctx, SEED } from './testHelpers.js';
import { prisma } from './wasp-server-stub.js';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`;
}

async function createTempUser() {
  return prisma.user.create({
    data: {
      email: uniqueEmail('api-temp-course-interest-student'),
      fullName: 'API Temp Interested User',
      phone: '+1 555 9000',
    },
    select: { id: true, email: true },
  });
}

async function getSeedCourseForSchool(schoolId: string): Promise<{ id: string; title: string }> {
  const course = await prisma.course.findFirst({
    where: { schoolId },
    select: {
      id: true,
      syllabusVersion: {
        select: {
          version: true,
          syllabus: { select: { name: true } },
        },
      },
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });

  if (!course) {
    throw new Error('Expected at least one seeded course in manager school scope.');
  }

  return {
    id: course.id,
    title: `${course.syllabusVersion.syllabus.name} v${course.syllabusVersion.version}`,
  };
}

describe('4.5 students page enrollment workflow (API)', () => {
  beforeEach(async () => {
    await cleanTestData();
  });

  it('[STD-MGR-003] manager students query returns student-course pairs sourced from course interests', async () => {
    const tempUser = await createTempUser();
    const targetCourse = await getSeedCourseForSchool(SEED.schools.cloudbase);

    await expressInterestInCourse(
      { courseId: targetCourse.id },
      { user: { id: tempUser.id } } as any,
    );

    const pairs = (await getManagerStudentCoursePairs(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager as any,
    )) as Array<{
      interestId: string;
      status: string;
      student: { email: string | null };
      course: { title: string };
    }>;

    expect(pairs.some((pair) => pair.student.email === tempUser.email && pair.course.title === targetCourse.title)).toBe(true);
  });

  it('[STD-MGR-007] manager can approve enrollment from interest and record ENROLLED state', async () => {
    const tempUser = await createTempUser();
    const targetCourse = await getSeedCourseForSchool(SEED.schools.cloudbase);

    const interest = await expressInterestInCourse(
      { courseId: targetCourse.id },
      { user: { id: tempUser.id } } as any,
    );

    await approveStudentEnrollmentFromInterest(
      {
        schoolId: SEED.schools.cloudbase,
        interestId: interest.id,
      },
      ctx.schoolManager as any,
    );

    const updatedInterest = await prisma.courseInterest.findUnique({
      where: { id: interest.id },
      select: { status: true },
    });

    expect(updatedInterest?.status).toBe('ENROLLED');

    const student = await prisma.student.findUnique({
      where: { userId: tempUser.id },
      select: { id: true },
    });

    expect(student?.id).toBeTruthy();

    const enrollment = await prisma.enrolledStudent.findFirst({
      where: {
        courseId: targetCourse.id,
        studentId: student?.id,
      },
      select: { courseId: true, studentId: true },
    });

    expect(enrollment?.courseId).toBe(targetCourse.id);
    expect(enrollment?.studentId).toBe(student?.id);
  });
});