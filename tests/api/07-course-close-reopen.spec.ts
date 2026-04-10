import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  closeCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerClosedCourses,
  getManagerCourseEnrollmentDetails,
  getManagerCourseInstructorDetails,
  getManagerCoursesForEnrollment,
  getManagerInstructorsForAssignment,
  getManagerStudentCoursePairs,
  getManagerStudentsForEnrollment,
  reopenCourse,
} from '../../src/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/school-manager/updateSchoolOperations.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED } from './testHelpers.js';

const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const OUTSIDER_SCHOOL_ID = 'seed-school-outsider-scope';
const OUTSIDER_STUDENT_USER_ID = 'seed-user-outsider-student';
const OUTSIDER_STUDENT_ID = 'seed-student-outsider-scope';
const OUTSIDER_INSTRUCTOR_USER_ID = 'seed-user-outsider-instructor';
const OUTSIDER_INSTRUCTOR_ID = 'seed-instructor-outsider-scope';

describe('4.8 course close/reopen lifecycle (API)', () => {
  beforeEach(async () => {
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

    await prisma.school.upsert({
      where: { id: OUTSIDER_SCHOOL_ID },
      update: {
        name: 'Outsider Scope School',
        addressLine1: '9 Boundary Lane',
        city: 'Outscope City',
        postalCode: '99999',
        country: 'US',
        currency: 'USD',
        adminId: SEED.users.systemAdmin01,
      },
      create: {
        id: OUTSIDER_SCHOOL_ID,
        name: 'Outsider Scope School',
        addressLine1: '9 Boundary Lane',
        city: 'Outscope City',
        postalCode: '99999',
        country: 'US',
        currency: 'USD',
        adminId: SEED.users.systemAdmin01,
      },
    });

    await prisma.user.upsert({
      where: { id: OUTSIDER_STUDENT_USER_ID },
      update: {
        email: 'seed+outsider_student@example.test',
        fullName: 'Outsider Student',
      },
      create: {
        id: OUTSIDER_STUDENT_USER_ID,
        email: 'seed+outsider_student@example.test',
        fullName: 'Outsider Student',
      },
    });

    await prisma.student.upsert({
      where: { userId: OUTSIDER_STUDENT_USER_ID },
      update: {},
      create: {
        id: OUTSIDER_STUDENT_ID,
        userId: OUTSIDER_STUDENT_USER_ID,
      },
    });

    await prisma.account.upsert({
      where: {
        userId_schoolId: {
          userId: OUTSIDER_STUDENT_USER_ID,
          schoolId: OUTSIDER_SCHOOL_ID,
        },
      },
      update: {},
      create: {
        userId: OUTSIDER_STUDENT_USER_ID,
        schoolId: OUTSIDER_SCHOOL_ID,
        currency: 'USD',
      },
    });

    await prisma.user.upsert({
      where: { id: OUTSIDER_INSTRUCTOR_USER_ID },
      update: {
        email: 'seed+outsider_instructor@example.test',
        fullName: 'Outsider Instructor',
      },
      create: {
        id: OUTSIDER_INSTRUCTOR_USER_ID,
        email: 'seed+outsider_instructor@example.test',
        fullName: 'Outsider Instructor',
      },
    });

    await prisma.instructor.upsert({
      where: { userId: OUTSIDER_INSTRUCTOR_USER_ID },
      update: {},
      create: {
        id: OUTSIDER_INSTRUCTOR_ID,
        userId: OUTSIDER_INSTRUCTOR_USER_ID,
      },
    });

    await prisma.account.upsert({
      where: {
        userId_schoolId: {
          userId: OUTSIDER_INSTRUCTOR_USER_ID,
          schoolId: OUTSIDER_SCHOOL_ID,
        },
      },
      update: {},
      create: {
        userId: OUTSIDER_INSTRUCTOR_USER_ID,
        schoolId: OUTSIDER_SCHOOL_ID,
        currency: 'USD',
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

  it('[STD-ENR-001] lists only students in manager school scope for enrollment', async () => {
    const students = await getManagerStudentsForEnrollment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    const studentUserIds = students.map((student) => student.userId);

    expect(studentUserIds).toContain(SEED.users.student01);
    expect(studentUserIds).toContain(SEED.users.student02);
    expect(studentUserIds).not.toContain(OUTSIDER_STUDENT_USER_ID);
  });

  it('[STD-ASN-001] lists only instructors in manager school scope for assignment', async () => {
    const instructors = await getManagerInstructorsForAssignment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    const instructorUserIds = instructors.map((instructor) => instructor.userId);

    expect(instructorUserIds).toContain(SEED.users.instructor01);
    expect(instructorUserIds).toContain(SEED.users.instructor02);
    expect(instructorUserIds).not.toContain(OUTSIDER_INSTRUCTOR_USER_ID);
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

  it('[STD-ENR-002][STD-ENR-003][STD-ENR-004] manager can enroll student, see roster updates, and duplicates are blocked', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-03T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    const students = await getManagerStudentsForEnrollment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    if (!students.length) {
      throw new Error('Expected seeded students in manager scope.');
    }

    const studentId = students[0]!.studentId;

    await enrollStudentInCourse(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
        studentId,
      },
      ctx.schoolManager,
    );

    const details = await getManagerCourseEnrollmentDetails(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
      },
      ctx.schoolManager,
    );

    expect(details).not.toBeNull();
    expect(details?.courseId).toBe(created.courseId);
    expect(details?.enrolledCount).toBeGreaterThanOrEqual(1);
    expect(details?.enrolledStudents.some((student) => student.studentId === studentId)).toBe(true);

    await expect(
      enrollStudentInCourse(
        {
          schoolId: SEED.schools.cloudbase,
          courseId: created.courseId,
          studentId,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Student is already enrolled in this course.',
    });
  });

  it('[STD-MGR-003][REGRESSION] direct enrollment appears in students approved pairs for the same course', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-09T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    const students = await getManagerStudentsForEnrollment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    if (!students.length) {
      throw new Error('Expected seeded students in manager scope.');
    }

    const student = students[0]!;

    await enrollStudentInCourse(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
        studentId: student.studentId,
      },
      ctx.schoolManager,
    );

    const courses = await getManagerCoursesForEnrollment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );
    const createdCourse = courses.find((course) => course.courseId === created.courseId);

    expect(createdCourse?.enrolledCount).toBeGreaterThanOrEqual(1);

    const pairs = await getManagerStudentCoursePairs(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
      },
      ctx.schoolManager,
    );

    expect(
      pairs.some(
        (pair) => pair.student.id === student.userId && pair.status === 'ENROLLED',
      ),
    ).toBe(true);
  });

  it('[STD-ASN-002][STD-ASN-003] manager can assign instructor and duplicate assignment is blocked', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-04T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    const instructors = await getManagerInstructorsForAssignment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    if (!instructors.length) {
      throw new Error('Expected seeded instructors in manager scope.');
    }

    const instructorId = instructors[0]!.instructorId;

    await assignInstructorToCourse(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
        instructorId,
      },
      ctx.schoolManager,
    );

    const details = await getManagerCourseInstructorDetails(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
      },
      ctx.schoolManager,
    );

    expect(details).not.toBeNull();
    expect(details?.courseId).toBe(created.courseId);
    expect(details?.assignedCount).toBeGreaterThanOrEqual(1);
    expect(details?.assignedInstructors.some((instructor) => instructor.instructorId === instructorId)).toBe(true);

    await expect(
      assignInstructorToCourse(
        {
          schoolId: SEED.schools.cloudbase,
          courseId: created.courseId,
          instructorId,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Instructor is already assigned to this course.',
    });
  });

  it('[STD-ASN-002] persists lead designation and agreed wage and keeps only one lead per course', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-10T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    const instructors = await getManagerInstructorsForAssignment(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    if (instructors.length < 2) {
      throw new Error('Expected at least two seeded instructors in manager scope.');
    }

    const firstInstructorId = instructors[0]!.instructorId;
    const secondInstructorId = instructors[1]!.instructorId;

    await assignInstructorToCourse(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
        instructorId: firstInstructorId,
        isLead: true,
        agreedWagePerHour: 55,
      },
      ctx.schoolManager,
    );

    await assignInstructorToCourse(
      {
        schoolId: SEED.schools.cloudbase,
        courseId: created.courseId,
        instructorId: secondInstructorId,
        isLead: true,
        agreedWagePerHour: 65,
      },
      ctx.schoolManager,
    );

    const assignments = await prisma.assignedInstructor.findMany({
      where: { courseId: created.courseId },
      select: {
        instructorId: true,
        isLead: true,
        agreedWagePerHour: true,
      },
      orderBy: { instructorId: 'asc' },
    });

    expect(assignments).toHaveLength(2);
    expect(assignments.filter((assignment) => assignment.isLead)).toHaveLength(1);
    expect(
      assignments.find((assignment) => assignment.instructorId === firstInstructorId),
    ).toMatchObject({
      instructorId: firstInstructorId,
      isLead: false,
      agreedWagePerHour: 55,
    });
    expect(
      assignments.find((assignment) => assignment.instructorId === secondInstructorId),
    ).toMatchObject({
      instructorId: secondInstructorId,
      isLead: true,
      agreedWagePerHour: 65,
    });
  });

  it('[STD-ENR-005][STD-ASN-006] manager cannot enroll or assign users from outside authorized school scope', async () => {
    const created = await createCourseFromFinalSyllabus(
      {
        syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID,
        startDate: new Date('2026-06-05T00:00:00.000Z').toISOString(),
      },
      ctx.schoolManager,
    );

    await expect(
      enrollStudentInCourse(
        {
          schoolId: SEED.schools.cloudbase,
          courseId: created.courseId,
          studentId: OUTSIDER_STUDENT_ID,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Student not found in your school scope.',
    });

    await expect(
      assignInstructorToCourse(
        {
          schoolId: SEED.schools.cloudbase,
          courseId: created.courseId,
          instructorId: OUTSIDER_INSTRUCTOR_ID,
        },
        ctx.schoolManager,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Instructor not found in your school scope.',
    });
  });
});
