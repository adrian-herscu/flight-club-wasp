/**
 * Course execution — Slice 7 API tests: Refund Lifecycle.
 *
 * Covers §7:
 *  - submitRefundRequest: guards + success
 *  - approveRefund: guards + financial effect
 *  - declineRefund: guards + success
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
  approveRefund,
  declineRefund,
  scheduleLesson,
  startCourse,
  submitRefundRequest,
} from '../../src/course-execution/operations.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED, useIsolatedCourseMembers, type IsolatedCourseMembers } from './testHelpers.js';
import { RefundRequestStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FINAL_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_01 = 'seed-lesson-tandem-flights-01';

let isolatedMembers: IsolatedCourseMembers;
let ctxStudent = ctx.student;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createStartedCourse() {
  const { courseId } = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID },
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

  // Fund student01 to afford enrollment
  await prisma.transaction.create({
    data: {
      accountId: isolatedMembers.student1.accountId,
      type: 'DEPOSIT',
      amountMinor: 100_000,
      currency: 'GBP',
      description: 'Test funding',
    },
  });

  await startCourse({ courseId }, ctx.schoolManager);
  return { courseId, student1Id: s1.studentId };
}

// ---------------------------------------------------------------------------
// Global beforeEach
// ---------------------------------------------------------------------------

beforeEach(async () => {
  isolatedMembers = await useIsolatedCourseMembers('api-16-refund-lifecycle');
  ctxStudent = isolatedMembers.student1.ctx;

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

// ===========================================================================
// submitRefundRequest — guards
// ===========================================================================

describe('submitRefundRequest — guards', () => {
  it('[STD-EXEC-052] rejects request for a course not in STARTED/COMPLETED/CLOSED state (409)', async () => {
    // OPEN course (not yet started)
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID },
      ctx.schoolManager,
    );
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const s = students.find((s) => s.userId === isolatedMembers.student1.userId)!;
    await expect(
      submitRefundRequest({ courseId, reason: 'changed my mind' }, ctxStudent),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-051] rejects duplicate PENDING request (INV-13, 409)', async () => {
    const { courseId } = await createStartedCourse();
    await submitRefundRequest({ courseId, reason: 'first request' }, ctxStudent);
    await expect(
      submitRefundRequest({ courseId, reason: 'second request' }, ctxStudent),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// submitRefundRequest — success
// ===========================================================================

describe('submitRefundRequest — success', () => {
  it('[STD-EXEC-050] creates a RefundRequest with PENDING status', async () => {
    const { courseId, student1Id } = await createStartedCourse();

    await submitRefundRequest({ courseId, reason: 'equipment issue' }, ctxStudent);

    const request = await prisma.refundRequest.findFirst({
      where: { courseId, studentId: student1Id },
    });
    expect(request?.status).toBe(RefundRequestStatus.PENDING);
    expect(request?.reason).toBe('equipment issue');
  });
});

// ===========================================================================
// approveRefund — guards
// ===========================================================================

describe('approveRefund — guards', () => {
  it('[STD-EXEC-055] rejects approval of an already-processed request (409, DECLINED)', async () => {
    const { courseId } = await createStartedCourse();
    await submitRefundRequest({ courseId, reason: 'test' }, ctxStudent);
    const req = await prisma.refundRequest.findFirst({ where: { courseId } });
    await declineRefund({ refundRequestId: req!.id, reason: 'no' }, ctx.schoolManager);

    await expect(
      approveRefund({ refundRequestId: req!.id, amountMinor: 100 }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// approveRefund — success / financial
// ===========================================================================

describe('approveRefund — success', () => {
  it('[STD-EXEC-053] transitions request status to APPROVED and records reviewer', async () => {
    const { courseId } = await createStartedCourse();
    await submitRefundRequest({ courseId, reason: 'test' }, ctxStudent);
    const req = await prisma.refundRequest.findFirst({ where: { courseId } });

    await approveRefund({ refundRequestId: req!.id, amountMinor: 200 }, ctx.schoolManager);

    const updated = await prisma.refundRequest.findUnique({ where: { id: req!.id } });
    expect(updated?.status).toBe(RefundRequestStatus.APPROVED);
    expect(updated?.approvedAmountMinor).toBe(200);
    expect(updated?.reviewedByUserId).toBe(SEED.users.schoolManager01);
    expect(updated?.reviewedAt).not.toBeNull();
  });

  it('[STD-EXEC-053] deposits approved amount to student account and debits school account (§8)', async () => {
    const { courseId } = await createStartedCourse();

    await submitRefundRequest({ courseId, reason: 'test' }, ctxStudent);
    const req = await prisma.refundRequest.findFirst({ where: { courseId } });

    await approveRefund({ refundRequestId: req!.id, amountMinor: 500 }, ctx.schoolManager);

    // Accounts are immutable: verify via transaction records (append-only ledger).
    // school WITHDRAWAL → student DEPOSIT (deposit.linkedTransactionId = withdrawal.id)
    const depositTx = await prisma.transaction.findFirst({
      where: { accountId: isolatedMembers.student1.accountId, type: 'DEPOSIT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(depositTx?.amountMinor).toBe(500);

    // The deposit's linkedTransactionId points back to the school's withdrawal
    const withdrawalTx = await prisma.transaction.findUnique({
      where: { id: depositTx!.linkedTransactionId! },
    });
    expect(withdrawalTx?.amountMinor).toBe(500);
    expect(withdrawalTx?.accountId).toBe('seed-account-manager-cloudbase');
  });
});

// ===========================================================================
// declineRefund — guards
// ===========================================================================

describe('declineRefund — guards', () => {
  it('[STD-EXEC-056] rejects declining an already-APPROVED request (409)', async () => {
    const { courseId } = await createStartedCourse();
    await submitRefundRequest({ courseId, reason: 'test' }, ctxStudent);
    const req = await prisma.refundRequest.findFirst({ where: { courseId } });
    await approveRefund({ refundRequestId: req!.id, amountMinor: 100 }, ctx.schoolManager);

    await expect(
      declineRefund({ refundRequestId: req!.id }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// declineRefund — success
// ===========================================================================

describe('declineRefund — success', () => {
  it('[STD-EXEC-054] transitions request status to DECLINED with optional reason', async () => {
    const { courseId } = await createStartedCourse();
    await submitRefundRequest({ courseId, reason: 'test' }, ctxStudent);
    const req = await prisma.refundRequest.findFirst({ where: { courseId } });

    await declineRefund(
      { refundRequestId: req!.id, reason: 'outside refund window' },
      ctx.schoolManager,
    );

    const updated = await prisma.refundRequest.findUnique({ where: { id: req!.id } });
    expect(updated?.status).toBe(RefundRequestStatus.DECLINED);
    expect(updated?.reason).toBe('outside refund window');
    expect(updated?.reviewedByUserId).toBe(SEED.users.schoolManager01);
  });
});
