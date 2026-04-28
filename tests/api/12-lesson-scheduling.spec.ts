/**
 * Course execution — Slice 3 API tests: Lesson Scheduling Lifecycle.
 *
 * Covers §2 of docs/course-state-machine.md:
 *  - scheduleLesson auth & scope guards
 *  - INV-02 (schedule overlap), INV-05 (duplicate non-CANCELLED lesson)
 *  - scheduleLesson success: CourseLesson created, MeetingAttendance + InstructorLessonPresence side effects
 *  - rescheduleLesson: SCHEDULED / BELOW_CAPACITY / CONFIRMED; resets attendance + presence; supersedes suggestion
 *  - rescheduleLesson guards: non-reschedulable states, CONFIRMED past-date
 *  - lessonStatusJob: SCHEDULED→CONFIRMED (capacity met), SCHEDULED→BELOW_CAPACITY, CONFIRMED→LESSON_UNDERWAY
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
} from '../../src/areas/school-manager/operations.js';
import { updateMyManagedSchool } from '../../src/areas/school-manager/updateSchoolOperations.js';
import {
  rescheduleLesson,
  scheduleLesson,
  startCourse,
} from '../../src/course-execution/operations.js';
import { lessonStatusJobHandler } from '../../src/course-execution/lessonStatusJob.js';
import { prisma } from './wasp-server-stub.js';
import { ctx, SEED, useIsolatedCourseMembers, type IsolatedCourseMembers } from './testHelpers.js';
import { CourseLessonStatus, InstructorSuggestionStatus, InstructorSuggestionType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FINAL_SYSTEM_SYLLABUS_VERSION_ID = 'seed-syllabus-version-tandem-flights-v1';
const SEED_LESSON_01 = 'seed-lesson-tandem-flights-01'; // position 1, 30 min
const SEED_LESSON_02 = 'seed-lesson-tandem-flights-02'; // position 2

let isolatedMembers: IsolatedCourseMembers;
let ctxLead = ctx.instructor;
let ctx2 = ctx.instructor;

// Date helpers — far future avoids accidental overlap with other test runs
const futureDate = (offsetHours = 500) => new Date(Date.now() + offsetHours * 3_600_000);
const pastDate = (offsetMinutes = 5) => new Date(Date.now() - offsetMinutes * 60_000);

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------
beforeEach(async () => {
  isolatedMembers = await useIsolatedCourseMembers('api-12-lesson-scheduling');
  ctxLead = isolatedMembers.instructor1.ctx;
  ctx2 = isolatedMembers.instructor2.ctx;

  // Reset any CONFIRMED/LESSON_UNDERWAY lessons left by prior test runs or
  // prior tests in this run so INV-02 checks start from a known clean state.
  // CourseLesson rows cannot be deleted (append-only trigger) but CAN be
  // status-updated (UPDATE trigger was dropped in Slice 3 migration).
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
// Shared helper: create a started course with instructor01 as lead
// ---------------------------------------------------------------------------
async function createStartedCourse(opts: { withStudent?: boolean } = {}) {
  const { courseId } = await createCourseFromFinalSyllabus(
    { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID },
    ctx.schoolManager,
  );

  // Find instructor01 by userId
  const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
  const lead = instructors.find((i) => i.userId === isolatedMembers.instructor1.userId);
  if (!lead) throw new Error('seed instructor01 not found in assignment list');

  await assignInstructorToCourse(
    { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
    ctx.schoolManager,
  );

  let studentId: string | undefined;
  if (opts.withStudent) {
    const students = await getManagerStudentsForEnrollment({}, ctx.schoolManager);
    const s =
      students.find((candidate) => candidate.userId === isolatedMembers.student1.userId) ??
      students[0];
    if (!s) throw new Error('no students available for enrollment');
    await enrollStudentInCourse({ courseId, studentId: s.studentId }, ctx.schoolManager);
    const account = await prisma.account.findUnique({
      where: {
        userId_schoolId: {
          userId: s.userId,
          schoolId: SEED.schools.cloudbase,
        },
      },
      select: { id: true },
    });
    if (!account) throw new Error('no account found for enrolled student');
    await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: 'DEPOSIT',
        amountMinor: 1_000_000,
        currency: 'GBP',
        description: 'Test funding before course start',
      },
    });
    studentId = s.studentId;
  }

  await startCourse({ courseId }, ctx.schoolManager);
  return { courseId, instructorId: lead.instructorId, studentId };
}

// ===========================================================================
// scheduleLesson — auth and scope
// ===========================================================================

describe('scheduleLesson — auth and scope', () => {
  it('rejects unauthenticated user with 401', async () => {
    const { courseId } = await createStartedCourse();
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
        ctx.unauthenticated,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a user with no Instructor profile with 403', async () => {
    const { courseId } = await createStartedCourse();
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
        ctx.schoolManager, // school manager has no Instructor profile
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects an instructor not assigned to the course with 403', async () => {
    const { courseId } = await createStartedCourse();
    // ctx2 = instructor02, NOT assigned as lead
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
        ctx2,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a non-lead instructor with 403', async () => {
    const { courseId, instructorId } = await createStartedCourse();
    // Assign instructor02 as non-lead
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const nonLead = instructors.find((i) => i.userId === isolatedMembers.instructor2.userId);
    if (!nonLead) throw new Error('instructor02 not found');
    await assignInstructorToCourse(
      { courseId, instructorId: nonLead.instructorId, isLead: false, agreedWagePerHour: 40 },
      ctx.schoolManager,
    );
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
        ctx2,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects unknown course with 404', async () => {
    await expect(
      scheduleLesson(
        { courseId: 'no-such-course', syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
        ctxLead,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ===========================================================================
// scheduleLesson — scheduling guards
// ===========================================================================

describe('scheduleLesson — scheduling guards', () => {
  it('blocks scheduling a lesson on an OPEN (not-started) course (409)', async () => {
    // Create course but do NOT start it
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const lead = instructors.find((i) => i.userId === isolatedMembers.instructor1.userId)!;
    await assignInstructorToCourse(
      { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(), location: 'Hill' },
        ctxLead,
      ),
    ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('started') });
  });

  it('rejects a syllabusLessonId not in the course syllabus with 404', async () => {
    const { courseId } = await createStartedCourse();
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: 'no-such-lesson', date: futureDate(), location: 'Hill' },
        ctxLead,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('blocks scheduling when a non-CANCELLED lesson already exists for the position (INV-05)', async () => {
    const { courseId } = await createStartedCourse();
    // First schedule — succeeds
    await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(600), location: 'Hill A' },
      ctxLead,
    );
    // Second schedule for same syllabusLessonId — must fail
    await expect(
      scheduleLesson(
        { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(700), location: 'Hill B' },
        ctxLead,
      ),
    ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('INV-05') });
  });

  it('blocks scheduling when the proposed time overlaps a CONFIRMED lesson for the instructor (INV-02)', async () => {
    // Course A: schedule lesson at futureDate(100), force it to CONFIRMED via DB
    const courseA = await createStartedCourse();
    const { courseLessonId: lessonA } = await scheduleLesson(
      {
        courseId: courseA.courseId,
        syllabusLessonId: SEED_LESSON_01,
        date: futureDate(100),
        location: 'Hill A',
        bufferMinutes: 0,
      },
      ctxLead,
    );
    // Force to CONFIRMED directly (bypasses immutability guard which was dropped)
    await prisma.courseLesson.update({
      where: { id: lessonA },
      data: { status: CourseLessonStatus.CONFIRMED },
    });

    // Course B: try to schedule a lesson that overlaps with lessonA window
    const courseB = await createStartedCourse();
    await expect(
      scheduleLesson(
        {
          courseId: courseB.courseId,
          syllabusLessonId: SEED_LESSON_01,
          date: futureDate(100), // same time window as lessonA
          location: 'Hill B',
          bufferMinutes: 0,
        },
        ctxLead,
      ),
    ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('INV-02') });
  });
});

// ===========================================================================
// scheduleLesson — success and side effects
// ===========================================================================

describe('scheduleLesson — success and side effects', () => {
  it('creates a CourseLesson with SCHEDULED status', async () => {
    const { courseId } = await createStartedCourse();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(1000), location: 'Launch Pad A' },
      ctxLead,
    );
    const lesson = await prisma.courseLesson.findUniqueOrThrow({ where: { id: courseLessonId } });
    expect(lesson.status).toBe(CourseLessonStatus.SCHEDULED);
    expect(lesson.courseId).toBe(courseId);
    expect(lesson.syllabusLessonId).toBe(SEED_LESSON_01);
    expect(lesson.location).toBe('Launch Pad A');
  });

  it('creates MeetingAttendance(NO_RESPONSE) for each enrolled student', async () => {
    const { courseId } = await createStartedCourse({ withStudent: true });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(1100), location: 'Meadow' },
      ctxLead,
    );
    const attendances = await prisma.meetingAttendance.findMany({ where: { courseLessonId } });
    expect(attendances.length).toBe(1);
    expect(attendances[0]!.status).toBe('NO_RESPONSE');
  });

  it('creates InstructorLessonPresence(EXPECTED) for each non-lead instructor', async () => {
    const { courseId } = await createStartedCourse();
    // Assign instructor02 as non-lead
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const nonLead = instructors.find((i) => i.userId === isolatedMembers.instructor2.userId)!;
    await assignInstructorToCourse(
      { courseId, instructorId: nonLead.instructorId, isLead: false, agreedWagePerHour: 40 },
      ctx.schoolManager,
    );
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(1200), location: 'Ridge' },
      ctxLead,
    );
    const presences = await prisma.instructorLessonPresence.findMany({ where: { courseLessonId } });
    expect(presences.length).toBe(1);
    expect(presences[0]!.status).toBe('EXPECTED');
    expect(presences[0]!.instructorId).toBe(nonLead.instructorId);
  });

  it('creates no MeetingAttendance when no students are enrolled', async () => {
    const { courseId } = await createStartedCourse(); // no student
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(1300), location: 'Cliff' },
      ctxLead,
    );
    const count = await prisma.meetingAttendance.count({ where: { courseLessonId } });
    expect(count).toBe(0);
  });
});

// ===========================================================================
// rescheduleLesson
// ===========================================================================

describe('rescheduleLesson', () => {
  it('successfully reschedules a SCHEDULED lesson', async () => {
    const { courseId } = await createStartedCourse();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(2000), location: 'Old Site' },
      ctxLead,
    );
    const newDate = futureDate(2500);
    await rescheduleLesson(
      { courseLessonId, date: newDate, location: 'New Site' },
      ctxLead,
    );
    const lesson = await prisma.courseLesson.findUniqueOrThrow({ where: { id: courseLessonId } });
    expect(lesson.date).toEqual(newDate);
    expect(lesson.location).toBe('New Site');
    expect(lesson.status).toBe(CourseLessonStatus.SCHEDULED);
  });

  it('resets MeetingAttendance to NO_RESPONSE on reschedule', async () => {
    const { courseId } = await createStartedCourse({ withStudent: true });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(3000), location: 'Site A' },
      ctxLead,
    );
    // Manually set attendance to ACCEPTED
    await prisma.meetingAttendance.updateMany({
      where: { courseLessonId },
      data: { status: 'ACCEPTED' },
    });
    await rescheduleLesson(
      { courseLessonId, date: futureDate(3500), location: 'Site B' },
      ctxLead,
    );
    const attendances = await prisma.meetingAttendance.findMany({ where: { courseLessonId } });
    expect(attendances.every((a) => a.status === 'NO_RESPONSE')).toBe(true);
  });

  it('supersedes a PENDING InstructorSuggestion on reschedule', async () => {
    const { courseId, instructorId } = await createStartedCourse();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(4000), location: 'Hill' },
      ctxLead,
    );
    // Plant a PENDING suggestion directly via prisma
    const suggestionId = `test-suggestion-${Date.now()}`;
    await prisma.instructorSuggestion.create({
      data: {
        id: suggestionId,
        courseLessonId,
        proposedByInstructorId: instructorId,
        type: InstructorSuggestionType.CLOSE_COURSE,
        status: InstructorSuggestionStatus.PENDING,
      },
    });
    await rescheduleLesson(
      { courseLessonId, date: futureDate(4500), location: 'New Hill' },
      ctxLead,
    );
    const suggestion = await prisma.instructorSuggestion.findUnique({
      where: { id: suggestionId },
    });
    expect(suggestion!.status).toBe(InstructorSuggestionStatus.SUPERSEDED);
  });

  it('blocks rescheduling a LESSON_UNDERWAY lesson with 409', async () => {
    const { courseId } = await createStartedCourse();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(5000), location: 'X' },
      ctxLead,
    );
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.LESSON_UNDERWAY },
    });
    await expect(
      rescheduleLesson({ courseLessonId, date: futureDate(5500), location: 'Y' }, ctxLead),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('blocks rescheduling a CONFIRMED lesson whose date has already passed', async () => {
    const { courseId } = await createStartedCourse();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(60), location: 'Past Site' },
      ctxLead,
    );
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.CONFIRMED },
    });
    await expect(
      rescheduleLesson({ courseLessonId, date: futureDate(6000), location: 'New' }, ctxLead),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ===========================================================================
// lessonStatusJob — cron-driven transitions
// ===========================================================================

describe('lessonStatusJob', () => {
  // NOTE on time offsets:
  // The reschedule-blocks-CONFIRMED-past test above leaves a CONFIRMED lesson
  // for ctxLead at ~pastDate(60) with a 60-min window [now-60, now].
  // To avoid INV-02 conflicts here we use dates far enough in the past so the
  // proposed window ends well before now-60.  Default buffer = 30 min, duration
  // = 30 min → window = 60 min.  pastDate(200) → [now-200, now-140]: safe ✓
  //
  // Also note: because both SCHEDULED→CONFIRMED (step 1) and CONFIRMED→
  // LESSON_UNDERWAY (step 2) fire in the same job run whenever date ≤ now,
  // a past-dated SCHEDULED lesson ends up as LESSON_UNDERWAY in one pass.
  // Test 1 therefore expects LESSON_UNDERWAY (not CONFIRMED) as its net state.
  // The unit tests (lessonMachine.spec.ts) cover the SCHEDULED→CONFIRMED atom.

  it('advances SCHEDULED→LESSON_UNDERWAY when capacity is met (or minCapacity is null)', async () => {
    const { courseId } = await createStartedCourse({ withStudent: true });
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(200), location: 'Field' },
      ctxLead,
    );
    // Set attendance to ACCEPTED so capacity is met (not stuck at BELOW_CAPACITY)
    await prisma.meetingAttendance.updateMany({
      where: { courseLessonId },
      data: { status: 'ACCEPTED' },
    });
    await lessonStatusJobHandler({} as never, {});
    const lesson = await prisma.courseLesson.findUniqueOrThrow({ where: { id: courseLessonId } });
    // Step 1: SCHEDULED → CONFIRMED (capacity met); step 2: CONFIRMED → LESSON_UNDERWAY
    expect(lesson.status).toBe(CourseLessonStatus.LESSON_UNDERWAY);
  });

  it('advances SCHEDULED→BELOW_CAPACITY when accepted count < minCapacity', async () => {
    const { courseId } = await createCourseFromFinalSyllabus(
      { syllabusVersionId: FINAL_SYSTEM_SYLLABUS_VERSION_ID, minCapacity: 5 },
      ctx.schoolManager,
    );
    const instructors = await getManagerInstructorsForAssignment({}, ctx.schoolManager);
    const lead = instructors.find((i) => i.userId === isolatedMembers.instructor1.userId)!;
    await assignInstructorToCourse(
      { courseId, instructorId: lead.instructorId, isLead: true, agreedWagePerHour: 50 },
      ctx.schoolManager,
    );
    await startCourse({ courseId, overrideCapacity: true }, ctx.schoolManager);
    // Use pastDate(300) so the proposed window [now-300, now-240] doesn't
    // overlap with any LESSON_UNDERWAY lesson left by the previous test.
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(300), location: 'Valley' },
      ctxLead,
    );
    // No student accepted → count = 0 < minCapacity = 5 → BELOW_CAPACITY
    // Step 2 is skipped because BELOW_CAPACITY is not a valid source state.
    await lessonStatusJobHandler({} as never, {});
    const lesson = await prisma.courseLesson.findUniqueOrThrow({ where: { id: courseLessonId } });
    expect(lesson.status).toBe(CourseLessonStatus.BELOW_CAPACITY);
  });

  it('advances CONFIRMED→LESSON_UNDERWAY when the lesson datetime is reached', async () => {
    const { courseId } = await createStartedCourse();
    // Use pastDate(400) so [now-400, now-340] is clear of prior LESSON_UNDERWAY windows.
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: pastDate(400), location: 'Summit' },
      ctxLead,
    );
    // Force CONFIRMED directly — simulates lesson that was confirmed in a prior run
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.CONFIRMED },
    });
    await lessonStatusJobHandler({} as never, {});
    const lesson = await prisma.courseLesson.findUniqueOrThrow({ where: { id: courseLessonId } });
    expect(lesson.status).toBe(CourseLessonStatus.LESSON_UNDERWAY);
  });

  it('does not advance lessons whose date has not yet been reached', async () => {
    const { courseId } = await createStartedCourse();
    const { courseLessonId } = await scheduleLesson(
      { courseId, syllabusLessonId: SEED_LESSON_01, date: futureDate(9999), location: 'FarFuture' },
      ctxLead,
    );
    await lessonStatusJobHandler({} as never, {});
    const lesson = await prisma.courseLesson.findUniqueOrThrow({ where: { id: courseLessonId } });
    expect(lesson.status).toBe(CourseLessonStatus.SCHEDULED);
  });
});
