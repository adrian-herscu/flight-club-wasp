import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
  getManagerFinancialDashboardSummary,
  recordStudentAccountTopUp,
} from '../../src/areas/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/areas/school-manager/updateSchoolOperations.js';
import { getStudentFinancialDashboardSummary } from '../../src/areas/student/operations.js';
import { getInstructorFinancialDashboardSummary } from '../../src/areas/instructor/operations.js';
import {
  scheduleLesson,
  startCourse,
  submitStudentAssessment,
} from '../../src/course-execution/operations.js';
import { lessonStatusJobHandler } from '../../src/course-execution/lessonStatusJob.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED, useIsolatedCourseMembers, type IsolatedCourseMembers } from './testHelpers.js';
import { CourseLessonStatus, PaymentMethod, SchoolRole } from '@prisma/client';

const FINAL_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_02 = 'seed-lesson-tandem-flights-02';

let isolatedMembers: IsolatedCourseMembers;
let ctxLead = ctx.instructor;

const pastDate = (offsetMinutes = 5) => new Date(Date.now() - offsetMinutes * 60_000);

async function ensureApprovedMemberRole(params: {
  userId: string;
  role: 'INSTRUCTOR' | 'STUDENT';
  requestId: string;
  decisionId: string;
}) {
  const { userId, role, requestId, decisionId } = params;

  await prisma.registrationRequest.upsert({
    where: { id: requestId },
    update: {
      requesterId: userId,
      requestedRole: role,
      status: 'APPROVED',
      targetSchoolId: SEED.schools.cloudbase,
      reviewerId: ctx.schoolManager.user.id,
      reviewedAt: new Date(),
    },
    create: {
      id: requestId,
      requesterId: userId,
      requestedRole: role,
      status: 'APPROVED',
      targetSchoolId: SEED.schools.cloudbase,
      reviewerId: ctx.schoolManager.user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.registrationRequestDecision.upsert({
    where: {
      requestId: requestId,
    },
    update: {
      decisionType: 'APPROVED',
      reviewerId: ctx.schoolManager.user.id,
    },
    create: {
      id: decisionId,
      decisionType: 'APPROVED',
      requestId,
      reviewerId: ctx.schoolManager.user.id,
    },
  });

  await prisma.userSchoolRole.upsert({
    where: {
      userId_schoolId_role: {
        userId,
        schoolId: SEED.schools.cloudbase,
        role,
      },
    },
    update: {
      revokedAt: null,
      sourceRegistrationRequestId: requestId,
      grantedByUserId: ctx.schoolManager.user.id,
    },
    create: {
      userId,
      schoolId: SEED.schools.cloudbase,
      role,
      sourceRegistrationRequestId: requestId,
      grantedByUserId: ctx.schoolManager.user.id,
    },
  });
}

beforeEach(async () => {
  isolatedMembers = await useIsolatedCourseMembers('api-18-dashboard-financial-summaries');
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

  await ensureApprovedMemberRole({
    userId: isolatedMembers.instructor1.userId,
    role: SchoolRole.INSTRUCTOR,
    requestId: `${isolatedMembers.instructor1.userId}-request-instructor`,
    decisionId: `${isolatedMembers.instructor1.userId}-decision-instructor`,
  });

  await ensureApprovedMemberRole({
    userId: isolatedMembers.student1.userId,
    role: SchoolRole.STUDENT,
    requestId: `${isolatedMembers.student1.userId}-request-student`,
    decisionId: `${isolatedMembers.student1.userId}-decision-student`,
  });
});

describe('dashboard financial summary queries', () => {
  it('[STD-EXEC-060] returns manager financial summary including recent top-ups', async () => {
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const student = students.find((candidate) => candidate.userId === isolatedMembers.student1.userId)!;

    await recordStudentAccountTopUp(
      {
        studentId: student.studentId,
        amountMinor: 250,
        paymentMethod: PaymentMethod.CASH,
        externalReference: 'DASH-TOPUP-001',
      },
      ctx.schoolManager,
    );

    const summary = await getManagerFinancialDashboardSummary(
      { schoolId: SEED.schools.cloudbase },
      ctx.schoolManager,
    );

    expect(summary.school.id).toBe(SEED.schools.cloudbase);
    expect(summary.recentTopUps.length).toBeGreaterThan(0);
    expect(summary.recentTopUps[0]?.studentName).toBeTruthy();
  });

  it('[STD-EXEC-061] returns instructor payout summary with pending amount after lesson conclusion', async () => {
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
        externalReference: 'DASH-FUND-300',
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

    const summary = await getInstructorFinancialDashboardSummary(
      { schoolId: SEED.schools.cloudbase },
      isolatedMembers.instructor1.ctx,
    );

    expect(summary.payouts.length).toBeGreaterThan(0);
    expect(summary.pendingAmountMinor).toBeGreaterThan(0);
  });

  it('[STD-EXEC-062] returns student balances and transactions summary', async () => {
    const studentSummaryBefore = await getStudentFinancialDashboardSummary({}, isolatedMembers.student1.ctx);

    await prisma.transaction.create({
      data: {
        accountId: isolatedMembers.student1.accountId,
        type: 'DEPOSIT',
        amountMinor: 123,
        currency: 'GBP',
        description: 'Manual student top-up',
      },
    });

    const studentSummaryAfter = await getStudentFinancialDashboardSummary({}, isolatedMembers.student1.ctx);

    expect(studentSummaryBefore.balances.length).toBeGreaterThan(0);
    expect(studentSummaryAfter.recentTransactions.length).toBeGreaterThan(0);
    expect(
      studentSummaryAfter.recentTransactions.some((tx) => tx.amountMinor === 123 && tx.type === 'DEPOSIT'),
    ).toBe(true);
  });
});
