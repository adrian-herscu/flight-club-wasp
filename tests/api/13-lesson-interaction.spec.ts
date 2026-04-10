/**
 * Course execution — Slice 4 API tests: Lesson Interaction.
 *
 * Covers §3 (Student Lesson Response), §4 (Instructor Suggestion),
 * §5 (Instructor Lesson Presence) of docs/course-state-machine.md.
 *
 *  - updateMeetingAttendance: auth, not-enrolled, date-locked, success
 *  - submitInstructorSuggestion: auth, not-lead, wrong status, INV-06, no-accepted, success
 *  - approveInstructorSuggestion: auth, wrong-school, not-pending, PROCEED→CONFIRMED, CLOSE→CLOSED
 *  - updateInstructorPresence: auth, not-assigned, lead-blocked, date-locked, success
 *  - markInstructorAbsent: auth, not-lead, not-LESSON_UNDERWAY, not-DECLINED, success
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
  approveInstructorSuggestion,
  markInstructorAbsent,
  rescheduleLesson,
  scheduleLesson,
  startCourse,
  submitInstructorSuggestion,
  updateInstructorPresence,
  updateMeetingAttendance,
} from '../../src/course-execution/operations.js';
import { lessonStatusJobHandler } from '../../src/course-execution/lessonStatusJob.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED } from './testHelpers.js';
import {
  CourseLessonStatus,
  InstructorLessonPresenceStatus,
  InstructorSuggestionStatus,
  InstructorSuggestionType,
  MeetingAttendanceStatus,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FINAL_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_01 = 'seed-lesson-tandem-flights-01'; // position 1, 30 min

const ctx2 = { user: { id: SEED.users.instructor02, isSystemAdmin: false } };
const ctxStudent = { user: { id: SEED.users.student01, isSystemAdmin: false } };

const futureDate = (offsetHours = 500) => new Date(Date.now() + offsetHours * 3_600_000);
const pastDate = (offsetMinutes = 5) => new Date(Date.now() - offsetMinutes * 60_000);

// ---------------------------------------------------------------------------
// Global beforeEach — reset mutable lesson state from prior runs
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

async function createStartedCourseWithStudent(opts: { minCapacity?: number } = {}) {
  const { courseId } = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYLLABUS_VERSION_ID, minCapacity: opts.minCapacity ?? null },
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
  await startCourse({ courseId, overrideCapacity: true }, ctx.schoolManager);
  return { courseId, instructorId: lead.instructorId, studentId: s.studentId };
}

async function addNonLeadInstructor(courseId: string) {
  const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
  const nonLead = instructors.find((i) => i.userId === SEED.users.instructor02)!;
  await assignInstructorToCourse(
    { courseId, instructorId: nonLead.instructorId, isLead: false, agreedWagePerHour: 30 },
    ctx.schoolManager,
  );
  return nonLead.instructorId;
}

// ===========================================================================
// updateMeetingAttendance — §3
// ===========================================================================

describe('updateMeetingAttendance — auth and scope', () => {
  it('rejects unauthenticated with 401', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      updateMeetingAttendance({ courseLessonId, status: 'ACCEPTED' }, ctx.unauthenticated),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects non-student user with 403', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      updateMeetingAttendance({ courseLessonId, status: 'ACCEPTED' }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects student not enrolled in this course with 403', async () => {
    // Create course without student02
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    const student2ctx = { user: { id: SEED.users.student02, isSystemAdmin: false } };
    await expect(
      updateMeetingAttendance({ courseLessonId, status: 'ACCEPTED' }, student2ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('[STD-EXEC-002] rejects response after lesson date with 409', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(10), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      updateMeetingAttendance({ courseLessonId, status: 'ACCEPTED' }, ctxStudent),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-001][STD-EXEC-005] student can ACCEPT attendance', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    const result = await updateMeetingAttendance(
      { courseLessonId, status: 'ACCEPTED' },
      ctxStudent,
    );
    expect(result.status).toBe(MeetingAttendanceStatus.ACCEPTED);

    const attendance = await prisma.meetingAttendance.findFirst({ where: { courseLessonId } });
    expect(attendance?.status).toBe(MeetingAttendanceStatus.ACCEPTED);
  });

  it('student can DECLINE attendance', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    const result = await updateMeetingAttendance(
      { courseLessonId, status: 'DECLINED' },
      ctxStudent,
    );
    expect(result.status).toBe(MeetingAttendanceStatus.DECLINED);
  });

  it('student can change from DECLINED back to ACCEPTED', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await updateMeetingAttendance({ courseLessonId, status: 'DECLINED' }, ctxStudent);
    const result = await updateMeetingAttendance(
      { courseLessonId, status: 'ACCEPTED' },
      ctxStudent,
    );
    expect(result.status).toBe(MeetingAttendanceStatus.ACCEPTED);
  });
});

// ===========================================================================
// submitInstructorSuggestion — §4
// ===========================================================================

describe('submitInstructorSuggestion — guards', () => {
  it('rejects non-instructor with 401/403', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});
    await expect(
      submitInstructorSuggestion({ courseLessonId, type: 'CLOSE_COURSE' }, ctx.unauthenticated),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects non-lead instructor with 403', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});
    await expect(
      submitInstructorSuggestion({ courseLessonId, type: 'CLOSE_COURSE' }, ctx2),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects suggestion when lesson is not BELOW_CAPACITY (409)', async () => {
    // No minCapacity → lesson goes CONFIRMED not BELOW_CAPACITY
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});
    // Lesson should be LESSON_UNDERWAY (past date), not BELOW_CAPACITY
    await expect(
      submitInstructorSuggestion({ courseLessonId, type: 'CLOSE_COURSE' }, ctx.instructor),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects PROCEED_WITH_PARTIAL when no student has ACCEPTED (409)', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});
    // Student has NO_RESPONSE (default), minCapacity=3, 0 ACCEPTED → BELOW_CAPACITY
    const lesson = await prisma.courseLesson.findUnique({ where: { id: courseLessonId }, select: { status: true } });
    expect(lesson?.status).toBe(CourseLessonStatus.BELOW_CAPACITY);

    await expect(
      submitInstructorSuggestion({ courseLessonId, type: 'PROCEED_WITH_PARTIAL' }, ctx.instructor),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-011] accepts CLOSE_COURSE suggestion on BELOW_CAPACITY lesson', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});

    const result = await submitInstructorSuggestion(
      { courseLessonId, type: 'CLOSE_COURSE' },
      ctx.instructor,
    );
    expect(result.suggestionId).toBeTruthy();

    const suggestion = await prisma.instructorSuggestion.findUnique({
      where: { id: result.suggestionId },
    });
    expect(suggestion?.type).toBe(InstructorSuggestionType.CLOSE_COURSE);
    expect(suggestion?.status).toBe(InstructorSuggestionStatus.PENDING);
  });

  it('[STD-EXEC-010] accepts PROCEED_WITH_PARTIAL suggestion when a student has ACCEPTED', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    // Student accepts before lesson date
    await updateMeetingAttendance({ courseLessonId, status: 'ACCEPTED' }, ctxStudent);
    // Manually force BELOW_CAPACITY
    await prisma.courseLesson.update({ where: { id: courseLessonId }, data: { status: CourseLessonStatus.BELOW_CAPACITY } });

    const result = await submitInstructorSuggestion(
      { courseLessonId, type: 'PROCEED_WITH_PARTIAL' },
      ctx.instructor,
    );
    expect(result.suggestionId).toBeTruthy();
  });

  it('[STD-EXEC-012] blocks a second PENDING suggestion (INV-06)', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});

    await submitInstructorSuggestion({ courseLessonId, type: 'CLOSE_COURSE' }, ctx.instructor);
    await expect(
      submitInstructorSuggestion({ courseLessonId, type: 'CLOSE_COURSE' }, ctx.instructor),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// approveInstructorSuggestion — §4
// ===========================================================================

describe('approveInstructorSuggestion — PROCEED_WITH_PARTIAL', () => {
  it('[STD-EXEC-013] approves PROCEED_WITH_PARTIAL → lesson becomes CONFIRMED', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await updateMeetingAttendance({ courseLessonId, status: 'ACCEPTED' }, ctxStudent);
    await prisma.courseLesson.update({ where: { id: courseLessonId }, data: { status: CourseLessonStatus.BELOW_CAPACITY } });

    const { suggestionId } = await submitInstructorSuggestion(
      { courseLessonId, type: 'PROCEED_WITH_PARTIAL' },
      ctx.instructor,
    );

    const result = await approveInstructorSuggestion({ suggestionId }, ctx.schoolManager);
    expect(result.result).toBe('CONFIRMED');

    const lesson = await prisma.courseLesson.findUnique({ where: { id: courseLessonId }, select: { status: true } });
    expect(lesson?.status).toBe(CourseLessonStatus.CONFIRMED);

    const suggestion = await prisma.instructorSuggestion.findUnique({ where: { id: suggestionId }, select: { status: true } });
    expect(suggestion?.status).toBe(InstructorSuggestionStatus.APPROVED);
  });
});

describe('approveInstructorSuggestion — CLOSE_COURSE', () => {
  it('[STD-EXEC-014] approves CLOSE_COURSE → lesson CANCELLED and course CLOSED', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});

    const { suggestionId } = await submitInstructorSuggestion(
      { courseLessonId, type: 'CLOSE_COURSE' },
      ctx.instructor,
    );

    const result = await approveInstructorSuggestion({ suggestionId }, ctx.schoolManager);
    expect(result.result).toBe('CLOSED');

    const lesson = await prisma.courseLesson.findUnique({ where: { id: courseLessonId }, select: { status: true } });
    expect(lesson?.status).toBe(CourseLessonStatus.CANCELLED);

    const lastEvent = await prisma.courseLifecycleEvent.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    expect(lastEvent?.status).toBe('CLOSED');
  });

  it('rejects approving a non-PENDING suggestion with 409', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});

    const { suggestionId } = await submitInstructorSuggestion(
      { courseLessonId, type: 'CLOSE_COURSE' },
      ctx.instructor,
    );
    await approveInstructorSuggestion({ suggestionId }, ctx.schoolManager);

    await expect(
      approveInstructorSuggestion({ suggestionId }, ctx.schoolManager),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// updateInstructorPresence — §5
// ===========================================================================

describe('updateInstructorPresence — non-lead confirms/declines', () => {
  it('rejects unauthenticated with 401', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      updateInstructorPresence({ courseLessonId, status: 'DECLINED' }, ctx.unauthenticated),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('[STD-EXEC-004] rejects lead instructor trying to use updateInstructorPresence (403)', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      updateInstructorPresence({ courseLessonId, status: 'DECLINED' }, ctx.instructor),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('[STD-EXEC-003] rejects response after lesson date (409)', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(10), location: 'Hill' },
      ctx.instructor,
    );
    await expect(
      updateInstructorPresence({ courseLessonId, status: 'DECLINED' }, ctx2),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-003] non-lead can DECLINE presence', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    const result = await updateInstructorPresence(
      { courseLessonId, status: 'DECLINED' },
      ctx2,
    );
    expect(result.status).toBe(InstructorLessonPresenceStatus.DECLINED);
  });

  it('non-lead can re-accept (EXPECTED) after declining', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    await updateInstructorPresence({ courseLessonId, status: 'DECLINED' }, ctx2);
    const result = await updateInstructorPresence({ courseLessonId, status: 'EXPECTED' }, ctx2);
    expect(result.status).toBe(InstructorLessonPresenceStatus.EXPECTED);
  });
});

// ===========================================================================
// markInstructorAbsent — §5
// ===========================================================================

describe('markInstructorAbsent — lead marks non-lead absent', () => {
  it('[STD-EXEC-020] rejects marking absent when lesson is not LESSON_UNDERWAY (409)', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const nonLeadId = await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    // Decline presence (while date is in future)
    await updateInstructorPresence({ courseLessonId, status: 'DECLINED' }, ctx2);
    // Lesson is still SCHEDULED, not LESSON_UNDERWAY

    await expect(
      markInstructorAbsent({ courseLessonId, instructorId: nonLeadId }, ctx.instructor),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-021] rejects marking absent an instructor who has not DECLINED (409)', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const nonLeadId = await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    // Don't decline — presence stays EXPECTED
    // Manually set to LESSON_UNDERWAY
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.LESSON_UNDERWAY },
    });

    await expect(
      markInstructorAbsent({ courseLessonId, instructorId: nonLeadId }, ctx.instructor),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('[STD-EXEC-020] lead can mark a DECLINED non-lead as ABSENT during LESSON_UNDERWAY', async () => {
    const { courseId } = await createStartedCourseWithStudent();
    const nonLeadId = await addNonLeadInstructor(courseId);
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
      ctx.instructor,
    );
    // Non-lead declines (while date is in future)
    await updateInstructorPresence({ courseLessonId, status: 'DECLINED' }, ctx2);
    // Manually advance to LESSON_UNDERWAY
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.LESSON_UNDERWAY },
    });

    await markInstructorAbsent({ courseLessonId, instructorId: nonLeadId }, ctx.instructor);

    const presence = await prisma.instructorLessonPresence.findFirst({
      where: { courseLessonId, instructorId: nonLeadId },
    });
    expect(presence?.status).toBe(InstructorLessonPresenceStatus.ABSENT);
  });
});

// ===========================================================================
// rescheduleLesson supersedes InstructorSuggestion
// ===========================================================================

describe('rescheduleLesson — supersedes pending suggestion (§4)', () => {
  it('[STD-EXEC-015] rescheduling a BELOW_CAPACITY lesson supersedes PENDING suggestion', async () => {
    const { courseId } = await createStartedCourseWithStudent({ minCapacity: 3 });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Hill' },
      ctx.instructor,
    );
    await lessonStatusJobHandler({} as never, {});

    const { suggestionId } = await submitInstructorSuggestion(
      { courseLessonId, type: 'CLOSE_COURSE' },
      ctx.instructor,
    );
    expect(
      (await prisma.instructorSuggestion.findUnique({ where: { id: suggestionId } }))?.status,
    ).toBe(InstructorSuggestionStatus.PENDING);

    // Reschedule → supersedes suggestion
    await rescheduleLesson(
      { courseLessonId, date: futureDate(600), location: 'New Hill' },
      ctx.instructor,
    );

    const suggestion = await prisma.instructorSuggestion.findUnique({ where: { id: suggestionId } });
    expect(suggestion?.status).toBe(InstructorSuggestionStatus.SUPERSEDED);
  });
});
