import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
  recordStudentAccountTopUp,
} from '../../src/areas/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/areas/school-manager/updateSchoolOperations.js';
import {
  getManagerInstructorPayouts,
  markInstructorPayoutPaid,
  scheduleLesson,
  startCourse,
  submitStudentAssessment,
} from '../../src/course-execution/operations.js';
import { lessonStatusJobHandler } from '../../src/course-execution/lessonStatusJob.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED, useIsolatedCourseMembers, type IsolatedCourseMembers } from './testHelpers.js';
import { CourseLessonStatus, InstructorPayoutStatus, PaymentMethod } from '@prisma/client';

const FINAL_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_02 = 'seed-lesson-tandem-flights-02';

let isolatedMembers: IsolatedCourseMembers;
let ctxLead = ctx.instructor;

const pastDate = (offsetMinutes = 5) => new Date(Date.now() - offsetMinutes * 60_000);

beforeEach(async () => {
  isolatedMembers = await useIsolatedCourseMembers('api-17-manual-finance-workflows');
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

describe('manual finance workflows', () => {
  it('[STD-EXEC-057] records manager top-up with metadata and creates a deposit transaction', async () => {
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const student = students.find((candidate) => candidate.userId === isolatedMembers.student1.userId)!;

    const beforeCount = await prisma.transaction.count({
      where: { accountId: isolatedMembers.student1.accountId, type: 'DEPOSIT' },
    });

    const result = await recordStudentAccountTopUp(
      {
        studentId: student.studentId,
        amountMinor: 400,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        externalReference: 'MANUAL-TOPUP-001',
        notes: 'Collected by manager',
      },
      ctx.schoolManager,
    );

    expect(result.studentId).toBe(student.studentId);

    const afterCount = await prisma.transaction.count({
      where: { accountId: isolatedMembers.student1.accountId, type: 'DEPOSIT' },
    });
    expect(afterCount).toBe(beforeCount + 1);

    const tx = await prisma.transaction.findUniqueOrThrow({
      where: { id: result.transactionId },
      select: {
        accountId: true,
        amountMinor: true,
        paymentMethod: true,
        externalReference: true,
      },
    });

    expect(tx.accountId).toBe(isolatedMembers.student1.accountId);
    expect(tx.amountMinor).toBe(400);
    expect(tx.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
    expect(tx.externalReference).toBe('MANUAL-TOPUP-001');
  });

  it('[STD-EXEC-058] supports discounted enrollment pricing and charges agreed amount at course start', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID, hourlyRate: 150 },
      ctx.schoolManager,
    );

    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const lead = instructors.find((candidate) => candidate.userId === isolatedMembers.instructor1.userId)!;
    await assignInstructorToCourse(
      { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );

    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const student = students.find((candidate) => candidate.userId === isolatedMembers.student1.userId)!;

    await enrollStudentInCourse(
      {
        courseId,
        studentId: student.studentId,
        agreedPriceMinor: 200,
        concessionReason: 'Manager-approved scholarship',
      },
      ctx.schoolManager,
    );

    const enrollment = await prisma.enrolledStudent.findUniqueOrThrow({
      where: {
        courseId_studentId: {
          courseId,
          studentId: student.studentId,
        },
      },
      select: {
        listPriceMinor: true,
        agreedPriceMinor: true,
        concessionReason: true,
        concessionApprovedByUserId: true,
      },
    });

    expect(enrollment.listPriceMinor).toBe(300);
    expect(enrollment.agreedPriceMinor).toBe(200);
    expect(enrollment.concessionReason).toBe('Manager-approved scholarship');
    expect(enrollment.concessionApprovedByUserId).toBe(ctx.schoolManager.user.id);

    await recordStudentAccountTopUp(
      {
        studentId: student.studentId,
        amountMinor: 200,
        paymentMethod: PaymentMethod.CASH,
        externalReference: 'CASH-200',
      },
      ctx.schoolManager,
    );

    await startCourse({ courseId }, ctx.schoolManager);

    const withdrawals = await prisma.transaction.findMany({
      where: {
        accountId: isolatedMembers.student1.accountId,
        type: 'WITHDRAWAL',
        description: { contains: `course ${courseId}` },
      },
      select: { amountMinor: true },
    });

    expect(withdrawals).toHaveLength(1);
    expect(withdrawals[0]?.amountMinor).toBe(200);
  });

  it('[STD-EXEC-059] creates pending payout on lesson conclusion and lets manager mark it as paid', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID, hourlyRate: 150 },
      ctx.schoolManager,
    );

    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const lead = instructors.find((candidate) => candidate.userId === isolatedMembers.instructor1.userId)!;
    await assignInstructorToCourse(
      { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );

    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const student = students.find((candidate) => candidate.userId === isolatedMembers.student1.userId)!;
    await enrollStudentInCourse({ courseId, studentId: student.studentId }, ctx.schoolManager);

    await recordStudentAccountTopUp(
      {
        studentId: student.studentId,
        amountMinor: 300,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        externalReference: 'START-FUNDING-300',
      },
      ctx.schoolManager,
    );

    await startCourse({ courseId }, ctx.schoolManager);

    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_02, date: pastDate(300), location: 'Hill' },
      ctxLead,
    );
    await lessonStatusJobHandler({} as never, {});

    await submitStudentAssessment(
      { courseLessonId, studentId: student.studentId, attended: true, status: 'PASS' },
      ctxLead,
    );

    const pendingPayouts = await getManagerInstructorPayouts(
      { status: InstructorPayoutStatus.PENDING, courseId },
      ctx.schoolManager,
    );
    const payout = pendingPayouts.find((candidate) => candidate.instructorId === lead.instructorId);
    expect(payout).toBeDefined();
    expect(payout?.amountMinor).toBe(75);

    const result = await markInstructorPayoutPaid(
      {
        payoutId: payout!.payoutId,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        externalReference: 'PAYOUT-LEAD-001',
        notes: 'Settled by manager',
      },
      ctx.schoolManager,
    );

    expect(result.status).toBe(InstructorPayoutStatus.PAID);

    const paidPayout = await prisma.instructorPayout.findUniqueOrThrow({
      where: { id: payout!.payoutId },
      select: {
        status: true,
        paymentMethod: true,
        externalReference: true,
        withdrawalTransactionId: true,
        depositTransactionId: true,
      },
    });

    expect(paidPayout.status).toBe(InstructorPayoutStatus.PAID);
    expect(paidPayout.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
    expect(paidPayout.externalReference).toBe('PAYOUT-LEAD-001');
    expect(paidPayout.withdrawalTransactionId).toBeTruthy();
    expect(paidPayout.depositTransactionId).toBeTruthy();
  });
});
