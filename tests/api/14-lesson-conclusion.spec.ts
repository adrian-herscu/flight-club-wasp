/**
 * Course execution — Slice 5 API tests: Lesson Conclusion.
 *
 * Covers §2 (LESSON_UNDERWAY → LESSON_CONCLUDED), §6 (student enrollment status),
 * and §8 (financial transactions at lesson conclusion).
 *
 *  - submitStudentAssessment: INV-15 (attended=false requires FAIL)
 *  - INV-10 (must be LESSON_UNDERWAY), INV-03 (only lead), INV-04 (only ACTIVE student)
 *  - duplicate assessment guard
 *  - PASS on non-final lesson: student stays ACTIVE
 *  - FAIL: student → FAILED immediately
 *  - PASS on final lesson (all ACTIVE assessed) → LESSON_CONCLUDED, student → CERTIFIED
 *  - course → COMPLETED when all students resolved
 *  - §8: instructor pay transactions created on LESSON_CONCLUDED (ABSENT skipped)
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
  markInstructorAbsent,
  scheduleLesson,
  startCourse,
  submitStudentAssessment,
  updateInstructorPresence,
} from '../../src/course-execution/operations.js';
import { lessonStatusJobHandler } from '../../src/course-execution/lessonStatusJob.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED } from './testHelpers.js';
import {
  CourseLessonStatus,
  CourseLifecycleStatus,
  EnrolledStudentStatus,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FINAL_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_01 = 'seed-lesson-tandem-flights-01'; // position 1 (30 min, non-final)
const SEED_LESSON_02 = 'seed-lesson-tandem-flights-02'; // position 2 (90 min, FINAL)

const ctx2 = { user: { id: SEED.users.instructor02, isSystemAdmin: false } };

const pastDate = (offsetMinutes = 5) => new Date(Date.now() - offsetMinutes * 60_000);

// ---------------------------------------------------------------------------
// Global beforeEach
// ---------------------------------------------------------------------------
beforeEach(async () => {
  await prisma.courseLesson.updateMany({
    where: { status: { in: [CourseLessonStatus.CONFIRMED, CourseLessonStatus.LESSON_UNDERWAY] } },
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

async function createStartedCourse(opts: { lesson2?: boolean; with2Students?: boolean } = {}) {
  const { courseId } = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID },
    ctx.schoolManager,
  );
  const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
  const lead = instructors.find((i) => i.userId === SEED.users.instructor01)!;
  await assignInstructorToCourse(
    { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
    ctx.schoolManager,
  );
  const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
  const s1 = students.find((s) => s.userId === SEED.users.student01)!;
  await enrollStudentInCourse({ courseId, studentId: s1.studentId }, ctx.schoolManager);
  if (opts.with2Students) {
    const s2 = students.find((s) => s.userId === SEED.users.student02)!;
    await enrollStudentInCourse({ courseId, studentId: s2.studentId }, ctx.schoolManager);
  }
  await startCourse({ courseId }, ctx.schoolManager);

  // Schedule and advance to LESSON_UNDERWAY
  const syllabusLessonId = opts.lesson2 ? SEED_LESSON_02 : SEED_LESSON_01;
  const { courseLessonId } = await scheduleLesson(
    { courseId, syllabusLessonId, date: pastDate(300), location: 'Hill' },
    ctx.instructor,
  );
  await lessonStatusJobHandler({} as never, {});

  // Verify state
  const lesson = await prisma.courseLesson.findUnique({ where: { id: courseLessonId }, select: { status: true } });
  if (lesson?.status !== CourseLessonStatus.LESSON_UNDERWAY) {
    throw new Error(`Expected LESSON_UNDERWAY but got ${lesson?.status}`);
  }

  const students2 = opts.with2Students
    ? students.filter((s) => s.userId === SEED.users.student01 || s.userId === SEED.users.student02)
    : [s1];

  return { courseId, courseLessonId, instructorId: lead.instructorId, students: students2 };
}

// ===========================================================================
// submitStudentAssessment — guards
// ===========================================================================

describe('submitStudentAssessment — INV-15 and auth guards', () => {
  it('[STD-EXEC-031] rejects attended=false with status=PASS (INV-15)', async () => {
    const { courseLessonId, students } = await createStartedCourse();
    await expect(
      submitStudentAssessment(
        { courseLessonId, studentId: students[0]!.studentId, attended: false, status: 'PASS' },
        ctx.instructor,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('[STD-EXEC-030] rejects submission when lesson is not LESSON_UNDERWAY (409)', async () => {
    // Create a course but only schedule (not advance to LESSON_UNDERWAY)
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const lead = instructors.find((i) => i.userId === SEED.users.instructor01)!;
    await assignInstructorToCourse(
      { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const s = students.find((s) => s.userId === SEED.users.student01)!;
    await enrollStudentInCourse({ courseId, studentId: s.studentId }, ctx.schoolManager);
    await startCourse({ courseId }, ctx.schoolManager);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: new Date(Date.now() + 3_600_000), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      submitStudentAssessment(
        { courseLessonId, studentId: s.studentId, attended: true, status: 'PASS' },
        ctx.instructor,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-038] rejects submission by non-lead instructor (403)', async () => {
    const { courseLessonId, students } = await createStartedCourse();
    // ctx2 (instructor02) is not assigned as lead — 403 fires without needing to add them
    await expect(
      submitStudentAssessment(
        { courseLessonId, studentId: students[0]!.studentId, attended: true, status: 'PASS' },
        ctx2,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('[STD-EXEC-037] rejects duplicate assessment (409)', async () => {
    const { courseLessonId, students } = await createStartedCourse();
    await submitStudentAssessment(
      { courseLessonId, studentId: students[0]!.studentId, attended: true, status: 'PASS' },
      ctx.instructor,
    );
    await expect(
      submitStudentAssessment(
        { courseLessonId, studentId: students[0]!.studentId, attended: true, status: 'PASS' },
        ctx.instructor,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// submitStudentAssessment — FAIL outcome
// ===========================================================================

describe('submitStudentAssessment — FAIL sets student FAILED', () => {
  it('[STD-EXEC-032] FAIL assessment → EnrolledStudent.status = FAILED', async () => {
    const { courseId, courseLessonId, students } = await createStartedCourse();
    const studentId = students[0]!.studentId;

    const result = await submitStudentAssessment(
      { courseLessonId, studentId, attended: true, status: 'FAIL' },
      ctx.instructor,
    );
    // Lesson concluded (only 1 active student, now FAILED)
    expect(result.lessonConcluded).toBe(true);

    const enrollment = await prisma.enrolledStudent.findFirst({
      where: { courseId, studentId },
    });
    expect(enrollment?.status).toBe(EnrolledStudentStatus.FAILED);
  });

  it('[STD-EXEC-030] attended=false with FAIL sets student FAILED', async () => {
    const { courseId, courseLessonId, students } = await createStartedCourse();
    const studentId = students[0]!.studentId;

    await submitStudentAssessment(
      { courseLessonId, studentId, attended: false, status: 'FAIL' },
      ctx.instructor,
    );

    const enrollment = await prisma.enrolledStudent.findFirst({ where: { courseId, studentId } });
    expect(enrollment?.status).toBe(EnrolledStudentStatus.FAILED);
  });
});

// ===========================================================================
// submitStudentAssessment — PASS on non-final lesson
// ===========================================================================

describe('submitStudentAssessment — PASS on non-final lesson', () => {
  it('[STD-EXEC-033] PASS on lesson 1 (non-final) → student stays ACTIVE, lesson CONCLUDED', async () => {
    const { courseId, courseLessonId, students } = await createStartedCourse({ lesson2: false });
    const studentId = students[0]!.studentId;

    const result = await submitStudentAssessment(
      { courseLessonId, studentId, attended: true, status: 'PASS' },
      ctx.instructor,
    );
    expect(result.lessonConcluded).toBe(true);
    expect(result.courseConcluded).toBe(false);

    const enrollment = await prisma.enrolledStudent.findFirst({ where: { courseId, studentId } });
    expect(enrollment?.status).toBe(EnrolledStudentStatus.ACTIVE);

    const lesson = await prisma.courseLesson.findUnique({ where: { id: courseLessonId }, select: { status: true } });
    expect(lesson?.status).toBe(CourseLessonStatus.LESSON_CONCLUDED);
  });
});

// ===========================================================================
// submitStudentAssessment — PASS on final lesson → CERTIFIED + course COMPLETED
// ===========================================================================

describe('submitStudentAssessment — final lesson PASS → CERTIFIED + course COMPLETED', () => {
  it('[STD-EXEC-034] PASS on final lesson → student CERTIFIED and course COMPLETED', async () => {
    const { courseId, courseLessonId, students } = await createStartedCourse({ lesson2: true });
    const studentId = students[0]!.studentId;

    const result = await submitStudentAssessment(
      { courseLessonId, studentId, attended: true, status: 'PASS' },
      ctx.instructor,
    );
    expect(result.lessonConcluded).toBe(true);
    expect(result.courseConcluded).toBe(true);

    const enrollment = await prisma.enrolledStudent.findFirst({ where: { courseId, studentId } });
    expect(enrollment?.status).toBe(EnrolledStudentStatus.CERTIFIED);

    const lastEvent = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(lastEvent?.status).toBe(CourseLifecycleStatus.COMPLETED);
  });

  it('[STD-EXEC-034] 2 students: both resolved → course COMPLETED', async () => {
    const { courseId, courseLessonId, students } = await createStartedCourse({
      lesson2: true,
      with2Students: true,
    });

    // First student PASS
    const result1 = await submitStudentAssessment(
      { courseLessonId, studentId: students[0]!.studentId, attended: true, status: 'PASS' },
      ctx.instructor,
    );
    expect(result1.lessonConcluded).toBe(false); // one student still pending
    expect(result1.courseConcluded).toBe(false);

    // Second student FAIL
    const result2 = await submitStudentAssessment(
      { courseLessonId, studentId: students[1]!.studentId, attended: false, status: 'FAIL' },
      ctx.instructor,
    );
    expect(result2.lessonConcluded).toBe(true);
    expect(result2.courseConcluded).toBe(true);

    const lastEvent = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(lastEvent?.status).toBe(CourseLifecycleStatus.COMPLETED);
  });
});

// ===========================================================================
// §8 Financial: instructor pay at LESSON_CONCLUDED
// ===========================================================================

describe('submitStudentAssessment — §8 instructor pay transactions', () => {
  it('[STD-EXEC-035] creates pay transaction for lead instructor when lesson concludes', async () => {
    const { courseId, courseLessonId, students } = await createStartedCourse({ lesson2: true });
    const studentId = students[0]!.studentId;

    const txBefore = await prisma.transaction.count({
      where: { accountId: 'seed-account-instructor-01-cloudbase' },
    });

    await submitStudentAssessment(
      { courseLessonId, studentId, attended: true, status: 'PASS' },
      ctx.instructor,
    );

    const txAfter = await prisma.transaction.count({
      where: { accountId: 'seed-account-instructor-01-cloudbase' },
    });
    expect(txAfter).toBeGreaterThan(txBefore);

    // instructor01 agreedWagePerHour=50, lesson 2 duration=90 min → 50 * 90/60 = 75 minor units
    const depositTx = await prisma.transaction.findFirst({
      where: { accountId: 'seed-account-instructor-01-cloudbase', type: 'DEPOSIT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(depositTx?.amountMinor).toBe(75);
  });

  it('[STD-EXEC-036] does not pay ABSENT non-lead instructor (INV-20)', async () => {
    // Create course and assign BOTH instructors BEFORE scheduling any lesson
    // (schedule conflict trigger fires on AssignedInstructor INSERT and joins
    //  CourseLesson for the new course — if no lessons exist yet, no conflict).
    const { courseId: cid } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const lead = instructors.find((i) => i.userId === SEED.users.instructor01)!;
    const nonLead = instructors.find((i) => i.userId === SEED.users.instructor02)!;
    await assignInstructorToCourse(
      { courseId: cid, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    // Assign non-lead BEFORE scheduling any lesson — no time-overlap check hits
    await assignInstructorToCourse(
      { courseId: cid, instructorId: nonLead.instructorId, isLead: false, agreedWagePerHour: 30 },
      ctx.schoolManager,
    );
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const s1 = students.find((s) => s.userId === SEED.users.student01)!;
    await enrollStudentInCourse({ courseId: cid, studentId: s1.studentId }, ctx.schoolManager);
    await startCourse({ courseId: cid }, ctx.schoolManager);

    // Schedule lesson for the far future so non-lead can decline (date > now)
    const { courseLessonId: clid } = await scheduleLesson(
      { courseId: cid, syllabusLessonId: SEED_LESSON_02, date: new Date(Date.now() + 1_000 * 3_600_000), location: 'Hill' },
      ctx.instructor,
    );
    // Non-lead declines before lesson date
    await updateInstructorPresence({ courseLessonId: clid, status: 'DECLINED' }, ctx2);
    // Force lesson to LESSON_UNDERWAY via direct DB update (trigger dropped in slice 3 migration)
    await prisma.courseLesson.updateMany({
      where: { id: clid },
      data: { status: CourseLessonStatus.LESSON_UNDERWAY },
    });
    // Lead marks absent
    await markInstructorAbsent(
      { courseLessonId: clid, instructorId: nonLead.instructorId },
      ctx.instructor,
    );

    const txBefore2 = await prisma.transaction.count({
      where: { accountId: 'seed-account-instructor-02-cloudbase' },
    });

    await submitStudentAssessment(
      { courseLessonId: clid, studentId: s1.studentId, attended: true, status: 'PASS' },
      ctx.instructor,
    );

    const txAfter2 = await prisma.transaction.count({
      where: { accountId: 'seed-account-instructor-02-cloudbase' },
    });
    // ABSENT instructor should not receive any pay transaction
    expect(txAfter2).toBe(txBefore2);
  });
});
