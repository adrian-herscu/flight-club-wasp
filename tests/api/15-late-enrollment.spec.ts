/**
 * Course execution — Slice 6 API tests: Late Enrollment.
 *
 * Covers §6 (enrollInStartedCourse) and §8 (financial charge on late enrollment).
 *
 *  - Rejects enrollment in non-STARTED course (409)
 *  - Rejects enrollment after first lesson is LESSON_UNDERWAY (INV-19)
 *  - Rejects already-enrolled student (409)
 *  - Success: creates EnrolledStudent, charges student account, creates hint attendance
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
} from '../../src/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/school-manager/updateSchoolOperations.js';
import {
  enrollInStartedCourse,
  scheduleLesson,
  startCourse,
} from '../../src/course-execution/operations.js';
import { lessonStatusJobHandler } from '../../src/course-execution/lessonStatusJob.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED, useIsolatedCourseMembers, type IsolatedCourseMembers } from './testHelpers.js';
import {
  CourseLessonStatus,
  EnrolledStudentStatus,
  MeetingAttendanceStatus,
} from '@prisma/client';

let isolatedMembers: IsolatedCourseMembers;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FINAL_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_01 = 'seed-lesson-tandem-flights-01'; // position 1
let ctxLead = ctx.instructor;

const futureDate = (offsetHours = 500) => new Date(Date.now() + offsetHours * 3_600_000);
const pastDate = (offsetMinutes = 5) => new Date(Date.now() - offsetMinutes * 60_000);

// ---------------------------------------------------------------------------
// Global beforeEach
// ---------------------------------------------------------------------------
beforeEach(async () => {
  isolatedMembers = await useIsolatedCourseMembers('api-15-late-enrollment');
  ctxLead = isolatedMembers.instructor1.ctx;

  await prisma.courseLesson.updateMany({
    where: {
      status: { in: [CourseLessonStatus.CONFIRMED, CourseLessonStatus.LESSON_UNDERWAY] },
      course: {
        assignedInstructors: {
          some: {
            instructor: {
              userId: {
                in: [isolatedMembers.instructor1.userId, isolatedMembers.instructor2.userId],
              },
            },
          },
        },
      },
    },
    data: { status: CourseLessonStatus.CANCELLED },
  });
  await updateMyManagedSchool(
    {
      schoolId: SEED.schools.cloudbase,
      name: 'Cloudbase Paragliding',
      websiteUrl: '',
      logoUrl: '',
      addressLine1: '1 Cloud Street',
      addressLine2: '',
      city: 'Skytown',
      stateProvince: '',
      postalCode: '00000',
      currency: 'GBP',
      defaultHourlyRate: 150,
    },
    ctx.schoolManager,
  );

});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createStartedCourseWithStudent1(opts: { hourlyRate?: number } = {}) {
  const { courseId } = await createCourseFromFinalSyllabus(
    {
      syllabusVersionId: FINAL_SYLLABUS_VERSION_ID,
      hourlyRate: opts.hourlyRate ?? 150,
    },
    ctx.schoolManager,
  );
  const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
  const lead = instructors.find((i) => i.userId === isolatedMembers.instructor1.userId)!;
  await assignInstructorToCourse(
    { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
    ctx.schoolManager,
  );
  const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
  const s1 = students.find((s) => s.userId === isolatedMembers.student1.userId)!;
  await enrollStudentInCourse({ courseId, studentId: s1.studentId }, ctx.schoolManager);
  await startCourse({ courseId }, ctx.schoolManager);

  const s2 = students.find((s) => s.userId === isolatedMembers.student2.userId)!;
  return { courseId, student1Id: s1.studentId, student2Id: s2.studentId };
}

async function fundStudent2Account(amountMinor = 100_000): Promise<void> {
  await prisma.transaction.create({
    data: {
      accountId: isolatedMembers.student2.accountId,
      type: 'DEPOSIT',
      amountMinor,
      currency: 'GBP',
      description: 'Test funding',
    },
  });
}

async function createUnfundedStudentInSchool(): Promise<string> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const userId = `api-late-enroll-unfunded-user-${suffix}`;
  const studentId = `api-late-enroll-unfunded-student-${suffix}`;
  const accountId = `api-late-enroll-unfunded-account-${suffix}`;

  await prisma.user.create({
    data: {
      id: userId,
      email: `api-late-enroll-unfunded-${suffix}@example.test`,
      fullName: 'API Unfunded Student',
    },
  });

  await prisma.student.create({
    data: {
      id: studentId,
      userId,
    },
  });

  await prisma.account.create({
    data: {
      id: accountId,
      userId,
      schoolId: SEED.schools.cloudbase,
      currency: 'GBP',
    },
  });

  return studentId;
}

// ===========================================================================
// enrollInStartedCourse — guards
// ===========================================================================

describe('enrollInStartedCourse — guards', () => {
  it('[STD-EXEC-040] rejects enrollment in a non-STARTED (OPEN) course (409)', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID },
      ctx.schoolManager,
    );
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const s = students.find((s) => s.userId === isolatedMembers.student2.userId)!;
    await expect(
      enrollInStartedCourse({ courseId, studentId: s.studentId }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-041] rejects enrollment once first lesson has reached LESSON_UNDERWAY (INV-19)', async () => {
    const { courseId, student2Id } = await createStartedCourseWithStudent1({
      hourlyRate: 10_000_000,
    });

    // Schedule lesson in past, run job → LESSON_UNDERWAY
    await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(300), location: 'Hill' },
      ctxLead,
    );
    await lessonStatusJobHandler({} as never, {});

    await expect(
      enrollInStartedCourse({ courseId, studentId: student2Id }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-040] rejects enrolling an already-enrolled student (409)', async () => {
    const { courseId, student1Id } = await createStartedCourseWithStudent1();
    await expect(
      enrollInStartedCourse({ courseId, studentId: student1Id }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-044] rejects enrollment when student account has insufficient balance (400)', async () => {
    // Set an impossibly high hourly rate to guarantee the charge exceeds any
    // accumulated test deposits (avoids relying on mutable account balance).
    await updateMyManagedSchool(
      {
        schoolId: SEED.schools.cloudbase,
        name: 'Cloudbase Paragliding',
        websiteUrl: '',
        logoUrl: '',
        addressLine1: '1 Cloud Street',
        addressLine2: '',
        city: 'Skytown',
        stateProvince: '',
        postalCode: '00000',
        currency: 'GBP',
        defaultHourlyRate: 10_000_000, // charge = 20M minor units >>> any balance
      },
      ctx.schoolManager,
    );
    const { courseId } = await createStartedCourseWithStudent1({
      hourlyRate: 10_000_000,
    });
    const unfundedStudentId = await createUnfundedStudentInSchool();

    await expect(
      enrollInStartedCourse({ courseId, studentId: unfundedStudentId }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ===========================================================================
// enrollInStartedCourse — success
// ===========================================================================

describe('enrollInStartedCourse — success', () => {
  it('[STD-EXEC-040] creates EnrolledStudent with ACTIVE status', async () => {
    await fundStudent2Account();
    const { courseId, student2Id } = await createStartedCourseWithStudent1();

    await enrollInStartedCourse({ courseId, studentId: student2Id }, ctx.schoolManager);

    const enrollment = await prisma.enrolledStudent.findFirst({
      where: { courseId, studentId: student2Id },
    });
    expect(enrollment?.status).toBe(EnrolledStudentStatus.ACTIVE);
  });

  it('[STD-EXEC-042] charges student account and credits school account (§8)', async () => {
    await fundStudent2Account();
    const { courseId, student2Id } = await createStartedCourseWithStudent1();

    await enrollInStartedCourse({ courseId, studentId: student2Id }, ctx.schoolManager);

    // Accounts are immutable: verify via transaction records (append-only ledger).
    // 2 lessons: 30 + 90 = 120 min = 2 hours; hourlyRate=150 → fee=300 minor units
    const withdrawalTx = await prisma.transaction.findFirst({
      where: { accountId: isolatedMembers.student2.accountId, type: 'WITHDRAWAL' },
      orderBy: { createdAt: 'desc' },
    });
    expect(withdrawalTx?.amountMinor).toBe(300);

    const depositTx = await prisma.transaction.findFirst({
      where: { accountId: 'seed-account-manager-cloudbase', type: 'DEPOSIT', linkedTransactionId: withdrawalTx!.id },
    });
    expect(depositTx?.amountMinor).toBe(300);
  });

  it('[STD-EXEC-043] creates ACCEPTED MeetingAttendance hint when active lesson exists', async () => {
    await fundStudent2Account();
    const { courseId, student2Id } = await createStartedCourseWithStudent1();

    // Schedule a lesson for the future
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctxLead,
    );

    await enrollInStartedCourse({ courseId, studentId: student2Id }, ctx.schoolManager);

    const attendance = await prisma.meetingAttendance.findFirst({
      where: { courseLessonId, studentId: student2Id },
    });
    expect(attendance?.status).toBe(MeetingAttendanceStatus.ACCEPTED);
  });

  it('[STD-EXEC-043] does not create attendance hint when no active lesson exists', async () => {
    await fundStudent2Account();
    const { courseId, student2Id } = await createStartedCourseWithStudent1();
    // No lesson scheduled yet

    await enrollInStartedCourse({ courseId, studentId: student2Id }, ctx.schoolManager);

    // Scope to this course's lessons to avoid picking up attendances from other tests
    const attendance = await prisma.meetingAttendance.findFirst({
      where: { studentId: student2Id, courseLesson: { courseId } },
    });
    expect(attendance).toBeNull();
  });
});
