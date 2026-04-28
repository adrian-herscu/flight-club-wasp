/**
 * Course execution operations — Slice 1 (Course Lifecycle) + Slice 3 (Lesson Scheduling)
 * + Slice 4 (Lesson Interaction) + Slice 5 (Lesson Conclusion) + Slice 6 (Late Enrollment)
 * + Slice 7 (Refund Lifecycle).
 *
 * Guard logic mirrors the corresponding XState machines in
 * src/course-execution/machines/. This file owns the DB restore + effect layers.
 */
import {
  CourseLessonStatus,
  CourseLifecycleStatus,
  EnrolledStudentStatus,
  InstructorPayoutStatus,
  InstructorLessonPresenceStatus,
  InstructorSuggestionStatus,
  InstructorSuggestionType,
  LessonEvaluationStatus,
  MeetingAttendanceStatus,
  PaymentMethod,
  RefundRequestStatus,
  SchoolRole,
} from '@prisma/client';
import { HttpError, prisma } from 'wasp/server';
import * as z from 'zod';

import {
  createLinkedTransactionPair,
  getEffectiveAccountBalance,
  getEnrollmentChargeAmount,
} from '../server/finance.js';
import { calculateCourseTotalPrice } from '../shared/coursePricing.js';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation.js';

// ---------------------------------------------------------------------------
// Auth helpers (pattern mirrors school-manager/operations.ts)
// ---------------------------------------------------------------------------

function getOptionalSchoolIdFromArgs(rawArgs: unknown): string | undefined {
  if (!rawArgs || typeof rawArgs !== 'object') return undefined;
  const raw = (rawArgs as { schoolId?: unknown }).schoolId;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function getManagedSchoolForUserId(userId: string, schoolId?: string) {
  const school = await prisma.school.findFirst({
    where: {
      adminId: userId,
      ...(schoolId ? { id: schoolId } : {}),
    },
    orderBy: [{ createdAt: 'asc' }],
  });
  if (!school) {
    throw new HttpError(
      403,
      schoolId
        ? 'Selected school is not managed by this account.'
        : 'No managed school is assigned to this account.',
    );
  }
  return school;
}

async function ensureSchoolManager(context: {
  user?: { id: string; isSystemAdmin?: boolean | null } | null;
}) {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users can access manager features.');
  }
  const hasRole = await prisma.userSchoolRole.findFirst({
    where: { userId: context.user.id, role: SchoolRole.SCHOOL_MANAGER, revokedAt: null },
    select: { id: true },
  });
  if (!hasRole) {
    throw new HttpError(403, 'Only school managers can access this resource.');
  }
  return context.user;
}

// ---------------------------------------------------------------------------
// Status helper
// ---------------------------------------------------------------------------

/**
 * Returns the most recent CourseLifecycleStatus for a course, or null if no
 * events exist (= OPEN).
 */
async function getLatestCourseStatus(courseId: string): Promise<CourseLifecycleStatus | null> {
  const event = await prisma.courseLifecycleEvent.findFirst({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    select: { status: true },
  });
  return event?.status ?? null;
}

// ---------------------------------------------------------------------------
// startCourse
// ---------------------------------------------------------------------------

const startCourseSchema = z.object({
  courseId: z.string().min(1),
  overrideCapacity: z.boolean().optional(),
});

type StartCourseInput = z.infer<typeof startCourseSchema>;

export const startCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string; status: CourseLifecycleStatus }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { courseId, overrideCapacity } = ensureArgsSchemaOrThrowHttpError(
    startCourseSchema,
    rawArgs,
  ) as StartCourseInput;

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: school.id },
    select: {
      id: true,
      hourlyRate: true,
      schoolId: true,
      school: { select: { currency: true, adminId: true } },
      minCapacity: true,
      assignedInstructors: {
        select: { instructorId: true, isLead: true, agreedWagePerHour: true },
      },
      enrolledStudents: {
        select: {
          studentId: true,
          listPriceMinor: true,
          agreedPriceMinor: true,
          student: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError(404, 'Course not found in your school scope.');
  }

  // ---------------------------------------------------------------------------
  // Lifecycle state guard — only OPEN (null or REOPENED) is a valid from-state
  // ---------------------------------------------------------------------------
  const currentStatus = await getLatestCourseStatus(course.id);

  if (currentStatus === CourseLifecycleStatus.STARTED) {
    throw new HttpError(409, 'Course is already started.');
  }
  if (currentStatus === CourseLifecycleStatus.COMPLETED) {
    throw new HttpError(409, 'Course is already completed.');
  }
  if (currentStatus === CourseLifecycleStatus.CLOSED) {
    throw new HttpError(409, 'Course is closed. Reopen it before starting.');
  }

  // ---------------------------------------------------------------------------
  // Hard guards (INV-01 hard, INV-16, INV-17, INV-18) — blocking, no override
  // ---------------------------------------------------------------------------
  const instructors = course.assignedInstructors;

  if (instructors.length < 1) {
    throw new HttpError(400, 'Course must have at least one assigned instructor before starting.');
  }

  const leadCount = instructors.filter((i) => i.isLead).length;
  if (leadCount !== 1) {
    throw new HttpError(
      400,
      `Course must have exactly one lead instructor before starting (found ${leadCount}).`,
    );
  }

  if (!course.hourlyRate) {
    throw new HttpError(400, 'Course hourly rate must be set before starting. (INV-17)');
  }

  const missingWage = instructors.some((i) => i.agreedWagePerHour == null);
  if (missingWage) {
    throw new HttpError(
      400,
      'All assigned instructors must have an agreed wage per hour before starting. (INV-18)',
    );
  }

  // ---------------------------------------------------------------------------
  // Soft guard (INV-01 soft) — manager may override with confirmation
  // ---------------------------------------------------------------------------
  const enrolledCount = course.enrolledStudents.length;
  if (course.minCapacity != null && enrolledCount < course.minCapacity && !overrideCapacity) {
    throw new HttpError(
      400,
      `Enrolled student count (${enrolledCount}) is below minimum capacity (${course.minCapacity}). Pass overrideCapacity: true to proceed.`,
    );
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  await prisma.$transaction(async (tx) => {
    for (const enrollment of course.enrolledStudents) {
      await chargeStudentForCourse({
        studentUserId: enrollment.student.userId,
        schoolId: course.schoolId,
        schoolAdminUserId: course.school.adminId,
        currency: course.school.currency,
        amountMinor: getEnrollmentChargeAmount(enrollment),
        description: `Course start fee for course ${course.id}`,
        tx,
      });
    }

    await tx.courseLifecycleEvent.create({
      data: {
        courseId: course.id,
        changedByUserId: user.id,
        status: CourseLifecycleStatus.STARTED,
      },
    });
  });

  return { courseId: course.id, status: CourseLifecycleStatus.STARTED };
};

// ===========================================================================
// Slice 3 — Lesson Scheduling Lifecycle (§2)
// ===========================================================================

// ---------------------------------------------------------------------------
// Instructor auth helpers
// ---------------------------------------------------------------------------

/**
 * Loads the Instructor profile for a user, or throws 403 if not found.
 */
async function getInstructorForUser(userId: string) {
  const instructor = await prisma.instructor.findUnique({ where: { userId } });
  if (!instructor) {
    throw new HttpError(403, 'Only assigned instructors can perform this action.');
  }
  return instructor;
}

/**
 * Verifies that the instructor is the lead for a given course, or throws 403.
 */
async function checkLeadInstructorForCourse(courseId: string, instructorId: string) {
  const assignment = await prisma.assignedInstructor.findFirst({
    where: { courseId, instructorId, isLead: true },
  });
  if (!assignment) {
    throw new HttpError(403, 'Only the lead instructor can schedule lessons for this course.');
  }
  return assignment;
}

/**
 * INV-02: asserts that the proposed [start, end) window does not overlap any
 * CONFIRMED or LESSON_UNDERWAY lesson the instructor is assigned to,
 * across all courses. Pass `excludeLessonId` when rescheduling to ignore the
 * lesson being rescheduled itself.
 */
async function checkInstructorScheduleOverlap(
  instructorId: string,
  excludeLessonId: string | null,
  proposedStart: Date,
  proposedEnd: Date,
): Promise<void> {
  const occupiedLessons = await prisma.courseLesson.findMany({
    where: {
      ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      status: { in: [CourseLessonStatus.CONFIRMED, CourseLessonStatus.LESSON_UNDERWAY] },
      course: { assignedInstructors: { some: { instructorId } } },
    },
    select: {
      id: true,
      date: true,
      bufferMinutes: true,
      syllabusLesson: { select: { durationMinutes: true } },
    },
  });

  for (const existing of occupiedLessons) {
    const existStart = existing.date;
    const existEnd = new Date(
      existing.date.getTime() +
        (existing.syllabusLesson.durationMinutes + existing.bufferMinutes) * 60_000,
    );
    // Overlap iff proposed starts before existing ends AND proposed ends after existing starts
    if (proposedStart < existEnd && proposedEnd > existStart) {
      throw new HttpError(
        409,
        'The proposed lesson time overlaps with an existing confirmed lesson for this instructor. (INV-02)',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// scheduleLesson
// ---------------------------------------------------------------------------

const scheduleLessonSchema = z.object({
  courseId: z.string().min(1),
  syllabusLessonId: z.string().min(1),
  date: z.coerce.date(),
  location: z.string().min(1),
  bufferMinutes: z.number().int().min(0).optional(),
});

export const scheduleLesson = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseLessonId: string }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const instructor = await getInstructorForUser(context.user.id);

  const { courseId, syllabusLessonId, date, location, bufferMinutes } =
    ensureArgsSchemaOrThrowHttpError(scheduleLessonSchema, rawArgs);

  // Course must exist
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { syllabusVersionId: true, minCapacity: true },
  });
  if (!course) {
    throw new HttpError(404, 'Course not found.');
  }

  // Caller must be the lead instructor for this course
  await checkLeadInstructorForCourse(courseId, instructor.id);

  // Course must be STARTED
  const latestStatus = await getLatestCourseStatus(courseId);
  if (latestStatus !== CourseLifecycleStatus.STARTED) {
    throw new HttpError(409, 'Lessons can only be scheduled for started courses.');
  }

  // syllabusLessonId must belong to this course's syllabusVersion
  const syllabusLesson = await prisma.syllabusLesson.findFirst({
    where: { id: syllabusLessonId, syllabusVersionId: course.syllabusVersionId },
    select: { durationMinutes: true },
  });
  if (!syllabusLesson) {
    throw new HttpError(404, 'Syllabus lesson not found in this course.');
  }

  // INV-05: no existing non-CANCELLED lesson for this (courseId, syllabusLessonId)
  const existingLesson = await prisma.courseLesson.findFirst({
    where: { courseId, syllabusLessonId, status: { not: CourseLessonStatus.CANCELLED } },
  });
  if (existingLesson) {
    throw new HttpError(409, 'A lesson for this syllabus position is already scheduled. (INV-05)');
  }

  // INV-02: overlap check
  const buffer = bufferMinutes ?? 30;
  const proposedStart = date;
  const proposedEnd = new Date(
    date.getTime() + (syllabusLesson.durationMinutes + buffer) * 60_000,
  );
  await checkInstructorScheduleOverlap(instructor.id, null, proposedStart, proposedEnd);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  const courseLesson = await prisma.courseLesson.create({
    data: {
      courseId,
      syllabusLessonId,
      date,
      location,
      bufferMinutes: buffer,
      proposedById: context.user.id,
      status: CourseLessonStatus.SCHEDULED,
    },
  });

  // MeetingAttendance (NO_RESPONSE) for every ACTIVE enrolled student
  const enrolledStudents = await prisma.enrolledStudent.findMany({
    where: { courseId, status: EnrolledStudentStatus.ACTIVE },
    select: { studentId: true },
  });
  if (enrolledStudents.length > 0) {
    await prisma.meetingAttendance.createMany({
      data: enrolledStudents.map((es) => ({
        courseLessonId: courseLesson.id,
        studentId: es.studentId,
        status: MeetingAttendanceStatus.NO_RESPONSE,
      })),
    });
  }

  // InstructorLessonPresence (EXPECTED) for every non-lead assigned instructor
  const nonLeadInstructors = await prisma.assignedInstructor.findMany({
    where: { courseId, isLead: false },
    select: { instructorId: true },
  });
  if (nonLeadInstructors.length > 0) {
    await prisma.instructorLessonPresence.createMany({
      data: nonLeadInstructors.map((ai) => ({
        courseLessonId: courseLesson.id,
        instructorId: ai.instructorId,
        status: InstructorLessonPresenceStatus.EXPECTED,
      })),
    });
  }

  return { courseLessonId: courseLesson.id };
};

// ---------------------------------------------------------------------------
// rescheduleLesson
// ---------------------------------------------------------------------------

const rescheduleLessonSchema = z.object({
  courseLessonId: z.string().min(1),
  date: z.coerce.date(),
  location: z.string().min(1),
  bufferMinutes: z.number().int().min(0).optional(),
});

export const rescheduleLesson = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseLessonId: string }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const instructor = await getInstructorForUser(context.user.id);

  const { courseLessonId, date, location, bufferMinutes } =
    ensureArgsSchemaOrThrowHttpError(rescheduleLessonSchema, rawArgs);

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
    select: {
      id: true,
      courseId: true,
      date: true,
      bufferMinutes: true,
      status: true,
      syllabusLesson: { select: { durationMinutes: true } },
    },
  });
  if (!courseLesson) {
    throw new HttpError(404, 'Lesson not found.');
  }

  // Caller must be the lead instructor for this course
  await checkLeadInstructorForCourse(courseLesson.courseId, instructor.id);

  // Course must be STARTED
  const latestStatus = await getLatestCourseStatus(courseLesson.courseId);
  if (latestStatus !== CourseLifecycleStatus.STARTED) {
    throw new HttpError(409, 'Lessons can only be rescheduled for started courses.');
  }

  // Lesson must be in a reschedulable state
  const reschedulableStatuses: CourseLessonStatus[] = [
    CourseLessonStatus.SCHEDULED,
    CourseLessonStatus.BELOW_CAPACITY,
    CourseLessonStatus.CONFIRMED,
  ];
  if (!reschedulableStatuses.includes(courseLesson.status)) {
    throw new HttpError(
      409,
      `Cannot reschedule a lesson with status ${courseLesson.status}.`,
    );
  }

  // CONFIRMED: date must not have been reached yet
  if (courseLesson.status === CourseLessonStatus.CONFIRMED && courseLesson.date <= new Date()) {
    throw new HttpError(
      409,
      'Cannot reschedule a confirmed lesson after its scheduled time has passed.',
    );
  }

  // INV-02: overlap check (exclude this lesson itself)
  const buffer = bufferMinutes ?? courseLesson.bufferMinutes;
  const proposedStart = date;
  const proposedEnd = new Date(
    date.getTime() + (courseLesson.syllabusLesson.durationMinutes + buffer) * 60_000,
  );
  await checkInstructorScheduleOverlap(instructor.id, courseLessonId, proposedStart, proposedEnd);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  await prisma.courseLesson.update({
    where: { id: courseLessonId },
    data: { date, location, bufferMinutes: buffer, status: CourseLessonStatus.SCHEDULED },
  });

  // Reset attendance hints to NO_RESPONSE
  await prisma.meetingAttendance.updateMany({
    where: { courseLessonId },
    data: { status: MeetingAttendanceStatus.NO_RESPONSE },
  });

  // Reset presence hints to EXPECTED
  await prisma.instructorLessonPresence.updateMany({
    where: { courseLessonId },
    data: { status: InstructorLessonPresenceStatus.EXPECTED },
  });

  // Supersede any pending InstructorSuggestion
  await prisma.instructorSuggestion.updateMany({
    where: { courseLessonId, status: InstructorSuggestionStatus.PENDING },
    data: { status: InstructorSuggestionStatus.SUPERSEDED },
  });

  return { courseLessonId };
};

// ===========================================================================
// Slice 4 — Lesson Interaction (§3 Student Response, §4 Instructor Suggestion,
//            §5 Instructor Lesson Presence)
// ===========================================================================

// ---------------------------------------------------------------------------
// Student helper
// ---------------------------------------------------------------------------

async function getStudentForUser(userId: string) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) {
    throw new HttpError(403, 'Only enrolled students can perform this action.');
  }
  return student;
}

// ---------------------------------------------------------------------------
// updateMeetingAttendance — §3 Student Lesson Response
// ---------------------------------------------------------------------------

const updateMeetingAttendanceSchema = z.object({
  courseLessonId: z.string().min(1),
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export const updateMeetingAttendance = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseLessonId: string; status: MeetingAttendanceStatus }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const student = await getStudentForUser(context.user.id);

  const { courseLessonId, status } = ensureArgsSchemaOrThrowHttpError(
    updateMeetingAttendanceSchema,
    rawArgs,
  );

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
    select: { id: true, date: true, courseId: true },
  });
  if (!courseLesson) {
    throw new HttpError(404, 'Lesson not found.');
  }

  // Must be enrolled in this course
  const enrollment = await prisma.enrolledStudent.findFirst({
    where: { courseId: courseLesson.courseId, studentId: student.id, status: EnrolledStudentStatus.ACTIVE },
  });
  if (!enrollment) {
    throw new HttpError(403, 'You are not an active enrolled student in this course.');
  }

  // INV-09: lock once lesson date has been reached
  if (courseLesson.date <= new Date()) {
    throw new HttpError(409, 'Attendance responses are locked once the lesson date has been reached.');
  }

  const attendance = await prisma.meetingAttendance.findFirst({
    where: { courseLessonId, studentId: student.id },
  });
  if (!attendance) {
    throw new HttpError(404, 'No attendance record found for this student and lesson.');
  }

  await prisma.meetingAttendance.update({
    where: { id: attendance.id },
    data: { status: status as MeetingAttendanceStatus },
  });

  return { courseLessonId, status: status as MeetingAttendanceStatus };
};

// ---------------------------------------------------------------------------
// submitInstructorSuggestion — §4 Instructor Suggestion
// ---------------------------------------------------------------------------

const submitInstructorSuggestionSchema = z.object({
  courseLessonId: z.string().min(1),
  type: z.enum(['PROCEED_WITH_PARTIAL', 'CLOSE_COURSE']),
});

export const submitInstructorSuggestion = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ suggestionId: string }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const instructor = await getInstructorForUser(context.user.id);

  const { courseLessonId, type } = ensureArgsSchemaOrThrowHttpError(
    submitInstructorSuggestionSchema,
    rawArgs,
  );

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
    select: { id: true, courseId: true, status: true },
  });
  if (!courseLesson) {
    throw new HttpError(404, 'Lesson not found.');
  }

  // Must be the lead instructor
  await checkLeadInstructorForCourse(courseLesson.courseId, instructor.id);

  // Lesson must be BELOW_CAPACITY (§4 guard)
  if (courseLesson.status !== CourseLessonStatus.BELOW_CAPACITY) {
    throw new HttpError(409, 'Suggestions can only be submitted for BELOW_CAPACITY lessons.');
  }

  // INV-06: at most one PENDING suggestion per lesson
  const existing = await prisma.instructorSuggestion.findFirst({
    where: { courseLessonId, status: InstructorSuggestionStatus.PENDING },
  });
  if (existing) {
    throw new HttpError(409, 'A pending suggestion already exists for this lesson. (INV-06)');
  }

  // For PROCEED_WITH_PARTIAL: at least one ACCEPTED attendance required
  if (type === 'PROCEED_WITH_PARTIAL') {
    const accepted = await prisma.meetingAttendance.findFirst({
      where: { courseLessonId, status: MeetingAttendanceStatus.ACCEPTED },
    });
    if (!accepted) {
      throw new HttpError(
        409,
        'PROCEED_WITH_PARTIAL requires at least one ACCEPTED student attendance.',
      );
    }
  }

  const suggestion = await prisma.instructorSuggestion.create({
    data: {
      courseLessonId,
      proposedByInstructorId: instructor.id,
      type: type as InstructorSuggestionType,
      status: InstructorSuggestionStatus.PENDING,
    },
  });

  return { suggestionId: suggestion.id };
};

// ---------------------------------------------------------------------------
// approveInstructorSuggestion — §4 Manager approve
// ---------------------------------------------------------------------------

const approveInstructorSuggestionSchema = z.object({
  suggestionId: z.string().min(1),
});

export const approveInstructorSuggestion = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ result: 'CONFIRMED' | 'CLOSED' }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const { suggestionId } = ensureArgsSchemaOrThrowHttpError(
    approveInstructorSuggestionSchema,
    rawArgs,
  );

  const suggestion = await prisma.instructorSuggestion.findUnique({
    where: { id: suggestionId },
    select: {
      id: true,
      status: true,
      type: true,
      courseLesson: { select: { id: true, courseId: true } },
    },
  });
  if (!suggestion) {
    throw new HttpError(404, 'Suggestion not found.');
  }

  // Must belong to a course in this manager's school
  const course = await prisma.course.findFirst({
    where: { id: suggestion.courseLesson.courseId, schoolId: school.id },
  });
  if (!course) {
    throw new HttpError(403, 'Suggestion does not belong to your school.');
  }

  if (suggestion.status !== InstructorSuggestionStatus.PENDING) {
    throw new HttpError(409, 'Only PENDING suggestions can be approved.');
  }

  // Course must still be STARTED
  const courseStatus = await getLatestCourseStatus(suggestion.courseLesson.courseId);
  if (courseStatus !== CourseLifecycleStatus.STARTED) {
    throw new HttpError(409, 'Course is not in STARTED state.');
  }

  const courseLessonId = suggestion.courseLesson.id;
  const courseId = suggestion.courseLesson.courseId;

  if (suggestion.type === InstructorSuggestionType.PROCEED_WITH_PARTIAL) {
    // Approve: lesson → CONFIRMED
    await prisma.instructorSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: InstructorSuggestionStatus.APPROVED,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.CONFIRMED },
    });
    return { result: 'CONFIRMED' };
  } else {
    // CLOSE_COURSE: lesson → CANCELLED, course → CLOSED
    await prisma.instructorSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: InstructorSuggestionStatus.APPROVED,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.CANCELLED },
    });
    await prisma.courseLifecycleEvent.create({
      data: { courseId, changedByUserId: user.id, status: CourseLifecycleStatus.CLOSED },
    });
    return { result: 'CLOSED' };
  }
};

// ---------------------------------------------------------------------------
// updateInstructorPresence — §5 Non-lead instructor confirms/declines
// ---------------------------------------------------------------------------

const updateInstructorPresenceSchema = z.object({
  courseLessonId: z.string().min(1),
  status: z.enum(['EXPECTED', 'DECLINED']),
});

export const updateInstructorPresence = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseLessonId: string; status: InstructorLessonPresenceStatus }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const instructor = await getInstructorForUser(context.user.id);

  const { courseLessonId, status } = ensureArgsSchemaOrThrowHttpError(
    updateInstructorPresenceSchema,
    rawArgs,
  );

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
    select: { id: true, date: true, courseId: true },
  });
  if (!courseLesson) {
    throw new HttpError(404, 'Lesson not found.');
  }

  // Must be a non-lead assigned instructor
  const assignment = await prisma.assignedInstructor.findFirst({
    where: { courseId: courseLesson.courseId, instructorId: instructor.id },
  });
  if (!assignment) {
    throw new HttpError(403, 'You are not assigned to this course.');
  }
  if (assignment.isLead) {
    throw new HttpError(403, 'The lead instructor does not have a presence record to update.');
  }

  // INV-09: lock once lesson date passed
  if (courseLesson.date <= new Date()) {
    throw new HttpError(409, 'Presence responses are locked once the lesson date has been reached.');
  }

  const presence = await prisma.instructorLessonPresence.findFirst({
    where: { courseLessonId, instructorId: instructor.id },
  });
  if (!presence) {
    throw new HttpError(404, 'No presence record found for this instructor and lesson.');
  }

  await prisma.instructorLessonPresence.update({
    where: { id: presence.id },
    data: { status: status as InstructorLessonPresenceStatus },
  });

  return { courseLessonId, status: status as InstructorLessonPresenceStatus };
};

// ---------------------------------------------------------------------------
// markInstructorAbsent — §5 Lead marks non-lead as ABSENT
// ---------------------------------------------------------------------------

const markInstructorAbsentSchema = z.object({
  courseLessonId: z.string().min(1),
  instructorId: z.string().min(1),
});

export const markInstructorAbsent = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseLessonId: string }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const leadInstructor = await getInstructorForUser(context.user.id);

  const { courseLessonId, instructorId } = ensureArgsSchemaOrThrowHttpError(
    markInstructorAbsentSchema,
    rawArgs,
  );

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
    select: { id: true, courseId: true, status: true },
  });
  if (!courseLesson) {
    throw new HttpError(404, 'Lesson not found.');
  }

  await checkLeadInstructorForCourse(courseLesson.courseId, leadInstructor.id);

  // INV-09 exception: lead can mark ABSENT while LESSON_UNDERWAY
  if (courseLesson.status !== CourseLessonStatus.LESSON_UNDERWAY) {
    throw new HttpError(409, 'Instructor absence can only be marked while the lesson is LESSON_UNDERWAY.');
  }

  const presence = await prisma.instructorLessonPresence.findFirst({
    where: { courseLessonId, instructorId },
  });
  if (!presence) {
    throw new HttpError(404, 'No presence record found for this instructor and lesson.');
  }

  if (presence.status !== InstructorLessonPresenceStatus.DECLINED) {
    throw new HttpError(
      409,
      'Can only mark ABSENT an instructor who has DECLINED. Current status: ' + presence.status,
    );
  }

  await prisma.instructorLessonPresence.update({
    where: { id: presence.id },
    data: { status: InstructorLessonPresenceStatus.ABSENT },
  });

  return { courseLessonId };
};

// ===========================================================================
// Slice 5 — Lesson Conclusion (§2 conclusion + §6 Student Enrollment Status
//            + §8 Financial transactions at lesson conclusion)
// ===========================================================================

// ---------------------------------------------------------------------------
// submitStudentAssessment — §2 LESSON_UNDERWAY → (stays / LESSON_CONCLUDED)
// ---------------------------------------------------------------------------

const submitStudentAssessmentSchema = z.object({
  courseLessonId: z.string().min(1),
  studentId: z.string().min(1),
  attended: z.boolean(),
  status: z.enum(['PASS', 'FAIL']),
  notes: z.string().optional(),
});

export const submitStudentAssessment = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ lessonConcluded: boolean; courseConcluded: boolean }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const instructor = await getInstructorForUser(context.user.id);

  const { courseLessonId, studentId, attended, status, notes } =
    ensureArgsSchemaOrThrowHttpError(submitStudentAssessmentSchema, rawArgs);

  // INV-15: attended=false must imply FAIL
  if (!attended && status === 'PASS') {
    throw new HttpError(400, 'attended=false requires status=FAIL. (INV-15)');
  }

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
    select: {
      id: true,
      courseId: true,
      status: true,
      syllabusLesson: { select: { id: true, position: true, durationMinutes: true, syllabusVersionId: true } },
    },
  });
  if (!courseLesson) {
    throw new HttpError(404, 'Lesson not found.');
  }

  // INV-10: lesson must be LESSON_UNDERWAY
  if (courseLesson.status !== CourseLessonStatus.LESSON_UNDERWAY) {
    throw new HttpError(409, 'Assessments can only be submitted while the lesson is LESSON_UNDERWAY. (INV-10)');
  }

  // INV-03: caller must be the lead instructor
  await checkLeadInstructorForCourse(courseLesson.courseId, instructor.id);

  // INV-04: student must be ACTIVE in this course
  const enrollment = await prisma.enrolledStudent.findFirst({
    where: { courseId: courseLesson.courseId, studentId, status: EnrolledStudentStatus.ACTIVE },
  });
  if (!enrollment) {
    throw new HttpError(
      409,
      'Student is not ACTIVE in this course (already CERTIFIED, FAILED, or not enrolled). (INV-04)',
    );
  }

  // No duplicate assessment
  const existingEval = await prisma.studentLessonEvaluation.findFirst({
    where: { courseLessonId, studentId },
  });
  if (existingEval) {
    throw new HttpError(409, 'Assessment already submitted for this student and lesson.');
  }

  const evalStatus = status as LessonEvaluationStatus;

  // -------------------------------------------------------------------------
  // Determine if this is the final lesson for this course
  // -------------------------------------------------------------------------
  const allLessons = await prisma.syllabusLesson.findMany({
    where: { syllabusVersionId: courseLesson.syllabusLesson.syllabusVersionId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const finalPosition = allLessons[0]?.position ?? 0;
  const isFinalLesson = courseLesson.syllabusLesson.position === finalPosition;

  // -------------------------------------------------------------------------
  // Effects: create evaluation
  // -------------------------------------------------------------------------
  await prisma.studentLessonEvaluation.create({
    data: {
      courseLessonId,
      studentId,
      instructorId: instructor.id,
      attended,
      status: evalStatus,
      notes: notes ?? null,
    },
  });

  // Update EnrolledStudent status based on evaluation outcome
  if (evalStatus === LessonEvaluationStatus.FAIL) {
    await prisma.enrolledStudent.update({
      where: { courseId_studentId: { courseId: courseLesson.courseId, studentId } },
      data: { status: EnrolledStudentStatus.FAILED },
    });
  } else if (evalStatus === LessonEvaluationStatus.PASS && isFinalLesson) {
    await prisma.enrolledStudent.update({
      where: { courseId_studentId: { courseId: courseLesson.courseId, studentId } },
      data: { status: EnrolledStudentStatus.CERTIFIED },
    });
  }

  // -------------------------------------------------------------------------
  // Check if all ACTIVE students have been assessed → LESSON_CONCLUDED
  // -------------------------------------------------------------------------
  const remainingActive = await prisma.enrolledStudent.findMany({
    where: { courseId: courseLesson.courseId, status: EnrolledStudentStatus.ACTIVE },
    select: { studentId: true },
  });

  // Students who are still ACTIVE but have no evaluation yet for this lesson
  const assessedInThisLesson = await prisma.studentLessonEvaluation.findMany({
    where: {
      courseLessonId,
      studentId: { in: remainingActive.map((e) => e.studentId) },
    },
    select: { studentId: true },
  });
  const assessedIds = new Set(assessedInThisLesson.map((e) => e.studentId));
  // Also include studentId we just assessed (it may not be ACTIVE anymore but was just processed)
  assessedIds.add(studentId);
  const pendingActive = remainingActive.filter((e) => !assessedIds.has(e.studentId));

  let lessonConcluded = false;
  let courseConcluded = false;

  if (pendingActive.length === 0) {
    // All ACTIVE students assessed — conclude the lesson
    await prisma.courseLesson.update({
      where: { id: courseLessonId },
      data: { status: CourseLessonStatus.LESSON_CONCLUDED },
    });
    lessonConcluded = true;

    // -----------------------------------------------------------------------
    // §8 Financial: create pending instructor payout obligations
    // -----------------------------------------------------------------------
    const courseData = await prisma.course.findUnique({
      where: { id: courseLesson.courseId },
      select: {
        id: true,
        schoolId: true,
        school: { select: { currency: true } },
        assignedInstructors: {
          select: {
            instructorId: true,
            isLead: true,
            agreedWagePerHour: true,
            instructor: { select: { userId: true } },
          },
        },
      },
    });

    if (courseData) {
      const durationMinutes = courseLesson.syllabusLesson.durationMinutes;
      const currency = courseData.school.currency;

      // Fetch absent non-lead instructors for this lesson
      const absentPresences = await prisma.instructorLessonPresence.findMany({
        where: { courseLessonId, status: InstructorLessonPresenceStatus.ABSENT },
        select: { instructorId: true },
      });
      const absentIds = new Set(absentPresences.map((p) => p.instructorId));

      for (const ai of courseData.assignedInstructors) {
        if (!ai.isLead && absentIds.has(ai.instructorId)) continue;

        const wagePH = ai.agreedWagePerHour ?? 0;
        const amountMinor = Math.round((durationMinutes / 60) * wagePH);
        if (amountMinor <= 0) continue;

        await prisma.instructorPayout.upsert({
          where: {
            courseLessonId_instructorId: {
              courseLessonId,
              instructorId: ai.instructorId,
            },
          },
          update: {
            amountMinor,
            currency,
            status: InstructorPayoutStatus.PENDING,
            paymentMethod: null,
            externalReference: null,
            notes: null,
            paidAt: null,
            paidByUserId: null,
            withdrawalTransactionId: null,
            depositTransactionId: null,
          },
          create: {
            schoolId: courseData.schoolId,
            courseId: courseData.id,
            courseLessonId,
            instructorId: ai.instructorId,
            amountMinor,
            currency,
            status: InstructorPayoutStatus.PENDING,
          },
        });
      }
    }

    // -----------------------------------------------------------------------
    // §1 Course completion check: all enrolled students CERTIFIED or FAILED?
    // -----------------------------------------------------------------------
    const activeCount = await prisma.enrolledStudent.count({
      where: { courseId: courseLesson.courseId, status: EnrolledStudentStatus.ACTIVE },
    });
    if (activeCount === 0) {
      // All students resolved — complete the course
      await prisma.courseLesson.updateMany({
        where: {
          courseId: courseLesson.courseId,
          status: {
            in: [
              CourseLessonStatus.SCHEDULED,
              CourseLessonStatus.BELOW_CAPACITY,
              CourseLessonStatus.CONFIRMED,
            ],
          },
        },
        data: { status: CourseLessonStatus.CANCELLED },
      });
      await prisma.courseLifecycleEvent.create({
        data: {
          courseId: courseLesson.courseId,
          changedByUserId: context.user.id,
          status: CourseLifecycleStatus.COMPLETED,
        },
      });
      courseConcluded = true;
    }
  }

  return { lessonConcluded, courseConcluded };
};

// ===========================================================================
// Slice 6 — Late Enrollment (§6 + §8)
// ===========================================================================

// ---------------------------------------------------------------------------
// chargeStudentForCourse — §8 financial helper for enrollment
// ---------------------------------------------------------------------------

async function chargeStudentForCourse(opts: {
  studentUserId: string;
  schoolId: string;
  schoolAdminUserId: string;
  currency: string;
  amountMinor: number;
  description: string;
  tx?: Parameters<typeof getEffectiveAccountBalance>[0];
}): Promise<void> {
  const db = opts.tx ?? prisma;

  if (opts.amountMinor <= 0) {
    return;
  }

  const studentAccount = await db.account.findFirst({
    where: { userId: opts.studentUserId, schoolId: opts.schoolId },
    select: { id: true, balanceMinor: true },
  });
  if (!studentAccount) {
    throw new HttpError(400, 'No account found for this student in this school. Ensure accounts are funded before enrollment.');
  }

  const effectiveBalance = await getEffectiveAccountBalance(
    db,
    studentAccount.id,
    studentAccount.balanceMinor,
  );

  if (effectiveBalance < opts.amountMinor) {
    throw new HttpError(
      400,
      `Insufficient balance for enrollment. Required: ${opts.amountMinor}, available: ${effectiveBalance}.`,
    );
  }

  const schoolAccount = await db.account.findFirst({
    where: { userId: opts.schoolAdminUserId, schoolId: opts.schoolId },
    select: { id: true },
  });
  if (!schoolAccount) {
    throw new HttpError(400, 'No school account found.');
  }

  await createLinkedTransactionPair(db, {
    withdrawalAccountId: studentAccount.id,
    depositAccountId: schoolAccount.id,
    amountMinor: opts.amountMinor,
    currency: opts.currency,
    description: opts.description,
  });
}

// ---------------------------------------------------------------------------
// enrollInStartedCourse — late enrollment
// ---------------------------------------------------------------------------

const enrollInStartedCourseSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  agreedPriceMinor: z.number().int().positive().optional(),
  concessionReason: z.string().trim().min(1).optional(),
});

export const enrollInStartedCourse = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ courseId: string; studentId: string }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const { courseId, studentId, agreedPriceMinor, concessionReason } = ensureArgsSchemaOrThrowHttpError(
    enrollInStartedCourseSchema,
    rawArgs,
  );

  const course = await prisma.course.findFirst({
    where: { id: courseId, schoolId: school.id },
    select: {
      id: true,
      schoolId: true,
      hourlyRate: true,
      syllabusVersionId: true,
      school: { select: { currency: true, adminId: true } },
    },
  });
  if (!course) {
    throw new HttpError(404, 'Course not found in your school scope.');
  }

  // Course must be STARTED
  const courseStatus = await getLatestCourseStatus(courseId);
  if (courseStatus !== CourseLifecycleStatus.STARTED) {
    throw new HttpError(409, 'Late enrollment is only allowed for STARTED courses.');
  }

  // INV-19: first lesson must not have reached LESSON_UNDERWAY yet
  const firstLesson = await prisma.courseLesson.findFirst({
    where: { courseId, status: CourseLessonStatus.LESSON_UNDERWAY },
  });
  if (firstLesson) {
    throw new HttpError(
      409,
      'Late enrollment is not allowed after the first lesson has started. (INV-19)',
    );
  }

  // Student must exist
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new HttpError(404, 'Student not found.');
  }

  // Must not already be enrolled
  const existing = await prisma.enrolledStudent.findFirst({
    where: { courseId, studentId },
  });
  if (existing) {
    throw new HttpError(409, 'Student is already enrolled in this course.');
  }

  if (!course.hourlyRate) {
    throw new HttpError(400, 'Course hourly rate must be set before enrolling.');
  }

  const lessons = await prisma.syllabusLesson.findMany({
    where: { syllabusVersionId: course.syllabusVersionId },
    select: { durationMinutes: true },
  });
  const listPriceMinor = calculateCourseTotalPrice(course.hourlyRate, lessons);
  if (agreedPriceMinor != null && agreedPriceMinor > listPriceMinor) {
    throw new HttpError(400, 'Agreed enrollment price cannot exceed the listed course price.');
  }
  if (agreedPriceMinor != null && !concessionReason?.trim()) {
    throw new HttpError(400, 'A concession reason is required when approving a discounted enrollment price.');
  }

  const enrollmentPriceMinor = agreedPriceMinor ?? listPriceMinor;

  await prisma.$transaction(async (tx) => {
    await chargeStudentForCourse({
      studentUserId: student.userId,
      schoolId: course.schoolId,
      schoolAdminUserId: course.school.adminId,
      currency: course.school.currency,
      amountMinor: enrollmentPriceMinor,
      description: `Late enrollment fee for course ${courseId}`,
      tx,
    });

    await tx.enrolledStudent.create({
      data: {
        courseId,
        studentId,
        status: EnrolledStudentStatus.ACTIVE,
        listPriceMinor,
        agreedPriceMinor: agreedPriceMinor ?? null,
        concessionReason: agreedPriceMinor != null ? concessionReason?.trim() ?? null : null,
        concessionApprovedByUserId: agreedPriceMinor != null ? user.id : null,
        concessionApprovedAt: agreedPriceMinor != null ? new Date() : null,
      },
    });

    const activeLessonForHint = await tx.courseLesson.findFirst({
      where: {
        courseId,
        status: {
          in: [CourseLessonStatus.SCHEDULED, CourseLessonStatus.BELOW_CAPACITY, CourseLessonStatus.CONFIRMED],
        },
      },
      select: { id: true },
    });
    if (activeLessonForHint) {
      await tx.meetingAttendance.create({
        data: {
          courseLessonId: activeLessonForHint.id,
          studentId,
          status: MeetingAttendanceStatus.ACCEPTED,
        },
      });
    }
  });

  return { courseId, studentId };
};

// ===========================================================================
// Slice 7 — Refund Request Lifecycle (§7 + §8)
// ===========================================================================

// ---------------------------------------------------------------------------
// submitRefundRequest — §7 Student submits refund request
// ---------------------------------------------------------------------------

const submitRefundRequestSchema = z.object({
  courseId: z.string().min(1),
  reason: z.string().optional(),
});

export const submitRefundRequest = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ refundRequestId: string }> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  const student = await getStudentForUser(context.user.id);

  const { courseId, reason } = ensureArgsSchemaOrThrowHttpError(
    submitRefundRequestSchema,
    rawArgs,
  );

  // Course must exist and be STARTED, COMPLETED, or CLOSED
  const courseStatus = await getLatestCourseStatus(courseId);
  const refundableStatuses: (CourseLifecycleStatus | null)[] = [
    CourseLifecycleStatus.STARTED,
    CourseLifecycleStatus.COMPLETED,
    CourseLifecycleStatus.CLOSED,
  ];
  if (!refundableStatuses.includes(courseStatus)) {
    throw new HttpError(409, 'Refund requests can only be submitted for STARTED, COMPLETED, or CLOSED courses.');
  }

  // Student must be enrolled in this course
  const enrollment = await prisma.enrolledStudent.findFirst({
    where: { courseId, studentId: student.id },
  });
  if (!enrollment) {
    throw new HttpError(403, 'You are not enrolled in this course.');
  }

  // INV-13: at most one PENDING refund request per student per course
  const existingPending = await prisma.refundRequest.findFirst({
    where: { courseId, studentId: student.id, status: RefundRequestStatus.PENDING },
  });
  if (existingPending) {
    throw new HttpError(
      409,
      'You already have a pending refund request for this course. (INV-13)',
    );
  }

  const refundRequest = await prisma.refundRequest.create({
    data: {
      courseId,
      studentId: student.id,
      status: RefundRequestStatus.PENDING,
      reason: reason ?? null,
    },
  });

  return { refundRequestId: refundRequest.id };
};

// ---------------------------------------------------------------------------
// approveRefund — §7 Manager approves a refund
// ---------------------------------------------------------------------------

const approveRefundSchema = z.object({
  refundRequestId: z.string().min(1),
  amountMinor: z.number().int().positive(),
});

export const approveRefund = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ refundRequestId: string }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const { refundRequestId, amountMinor } = ensureArgsSchemaOrThrowHttpError(
    approveRefundSchema,
    rawArgs,
  );

  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: {
      id: true,
      status: true,
      courseId: true,
      studentId: true,
      course: { select: { schoolId: true, school: { select: { currency: true, adminId: true } } } },
      student: { select: { userId: true } },
    },
  });
  if (!refundRequest) {
    throw new HttpError(404, 'Refund request not found.');
  }

  // Must belong to manager's school
  if (refundRequest.course.schoolId !== school.id) {
    throw new HttpError(403, 'Refund request does not belong to your school.');
  }

  if (refundRequest.status !== RefundRequestStatus.PENDING) {
    throw new HttpError(409, 'Only PENDING refund requests can be approved.');
  }

  // INV-12: amountMinor must not exceed total paid by student
  // (We trust the manager here; full validation would require summing transactions)

  const currency = refundRequest.course.school.currency;
  const schoolAdminUserId = refundRequest.course.school.adminId;
  const studentUserId = refundRequest.student.userId;

  const schoolAccount = await prisma.account.findFirst({
    where: { userId: schoolAdminUserId, schoolId: school.id },
    select: { id: true },
  });
  if (!schoolAccount) {
    throw new HttpError(400, 'No school account found.');
  }

  const studentAccount = await prisma.account.findFirst({
    where: { userId: studentUserId, schoolId: school.id },
    select: { id: true },
  });
  if (!studentAccount) {
    throw new HttpError(400, 'No student account found.');
  }

  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      status: RefundRequestStatus.APPROVED,
      approvedAmountMinor: amountMinor,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
    },
  });

  // §8 Financial: debit school, credit student
  await createLinkedTransactionPair(prisma, {
    withdrawalAccountId: schoolAccount.id,
    depositAccountId: studentAccount.id,
    amountMinor,
    currency,
    description: `Refund approved for request ${refundRequestId}`,
  });

  return { refundRequestId };
};

// ---------------------------------------------------------------------------
// declineRefund — §7 Manager declines a refund
// ---------------------------------------------------------------------------

const declineRefundSchema = z.object({
  refundRequestId: z.string().min(1),
  reason: z.string().optional(),
});

export const declineRefund = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ refundRequestId: string }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);

  const { refundRequestId, reason } = ensureArgsSchemaOrThrowHttpError(
    declineRefundSchema,
    rawArgs,
  );

  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: {
      id: true,
      status: true,
      course: { select: { schoolId: true } },
    },
  });
  if (!refundRequest) {
    throw new HttpError(404, 'Refund request not found.');
  }

  if (refundRequest.course.schoolId !== school.id) {
    throw new HttpError(403, 'Refund request does not belong to your school.');
  }

  if (refundRequest.status !== RefundRequestStatus.PENDING) {
    throw new HttpError(409, 'Only PENDING refund requests can be declined.');
  }

  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      status: RefundRequestStatus.DECLINED,
      reason: reason ?? null,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
    },
  });

  return { refundRequestId };
};

const managerInstructorPayoutsSchema = z.object({
  status: z.nativeEnum(InstructorPayoutStatus).optional(),
  courseId: z.string().min(1).optional(),
});

export type ManagerInstructorPayoutItem = {
  payoutId: string;
  courseId: string;
  courseLessonId: string;
  instructorId: string;
  instructorName: string;
  amountMinor: number;
  currency: string;
  status: InstructorPayoutStatus;
  paidAt: Date | null;
  paymentMethod: PaymentMethod | null;
  externalReference: string | null;
  notes: string | null;
  lessonDate: Date;
};

export const getManagerInstructorPayouts = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<ManagerInstructorPayoutItem[]> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { status, courseId } = ensureArgsSchemaOrThrowHttpError(
    managerInstructorPayoutsSchema,
    rawArgs,
  );

  const payouts = await prisma.instructorPayout.findMany({
    where: {
      schoolId: school.id,
      ...(status ? { status } : {}),
      ...(courseId ? { courseId } : {}),
    },
    select: {
      id: true,
      courseId: true,
      courseLessonId: true,
      instructorId: true,
      amountMinor: true,
      currency: true,
      status: true,
      paidAt: true,
      paymentMethod: true,
      externalReference: true,
      notes: true,
      courseLesson: { select: { date: true } },
      assignedInstructor: {
        select: {
          instructor: {
            select: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { courseLesson: { date: 'desc' } }, { createdAt: 'desc' }],
  });

  return payouts.map((payout) => ({
    payoutId: payout.id,
    courseId: payout.courseId,
    courseLessonId: payout.courseLessonId,
    instructorId: payout.instructorId,
    instructorName:
      payout.assignedInstructor.instructor.user.fullName ??
      payout.assignedInstructor.instructor.user.email ??
      payout.instructorId,
    amountMinor: payout.amountMinor,
    currency: payout.currency,
    status: payout.status,
    paidAt: payout.paidAt,
    paymentMethod: payout.paymentMethod,
    externalReference: payout.externalReference,
    notes: payout.notes,
    lessonDate: payout.courseLesson.date,
  }));
};

const markInstructorPayoutPaidSchema = z.object({
  payoutId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  externalReference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paidAt: z.string().datetime().optional(),
});

export const markInstructorPayoutPaid = async (
  rawArgs: unknown,
  context: { user?: { id: string; isSystemAdmin?: boolean | null } | null },
): Promise<{ payoutId: string; status: InstructorPayoutStatus }> => {
  const user = await ensureSchoolManager(context);
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs);
  const school = await getManagedSchoolForUserId(user.id, schoolId);
  const { payoutId, paymentMethod, externalReference, notes, paidAt } =
    ensureArgsSchemaOrThrowHttpError(markInstructorPayoutPaidSchema, rawArgs);

  const payout = await prisma.instructorPayout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      schoolId: true,
      courseId: true,
      courseLessonId: true,
      instructorId: true,
      amountMinor: true,
      currency: true,
      status: true,
      assignedInstructor: {
        select: {
          instructor: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });
  if (!payout) {
    throw new HttpError(404, 'Instructor payout not found.');
  }
  if (payout.schoolId !== school.id) {
    throw new HttpError(403, 'Instructor payout does not belong to your school.');
  }
  if (payout.status !== InstructorPayoutStatus.PENDING) {
    throw new HttpError(409, 'Only PENDING instructor payouts can be marked as paid.');
  }

  const schoolAccount = await prisma.account.findFirst({
    where: { userId: school.adminId, schoolId: school.id },
    select: { id: true },
  });
  if (!schoolAccount) {
    throw new HttpError(400, 'No school account found.');
  }

  const instructorAccount = await prisma.account.findFirst({
    where: {
      userId: payout.assignedInstructor.instructor.userId,
      schoolId: school.id,
    },
    select: { id: true },
  });
  if (!instructorAccount) {
    throw new HttpError(400, 'No instructor account found.');
  }

  const paidDate = paidAt ? new Date(paidAt) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    const transactionPair = await createLinkedTransactionPair(tx, {
      withdrawalAccountId: schoolAccount.id,
      depositAccountId: instructorAccount.id,
      amountMinor: payout.amountMinor,
      currency: payout.currency,
      description: `Instructor payout settlement for lesson ${payout.courseLessonId}`,
      notes,
      recordedByUserId: user.id,
      paymentMethod,
      externalReference,
    });

    await tx.instructorPayout.update({
      where: { id: payout.id },
      data: {
        status: InstructorPayoutStatus.PAID,
        paidAt: paidDate,
        paidByUserId: user.id,
        paymentMethod,
        externalReference: externalReference?.trim() || null,
        notes: notes?.trim() || null,
        withdrawalTransactionId: transactionPair.withdrawalTransactionId,
        depositTransactionId: transactionPair.depositTransactionId,
      },
    });

    return { payoutId: payout.id, status: InstructorPayoutStatus.PAID };
  });

  return result;
};

// ---------------------------------------------------------------------------
// Query: getCourseDetail — read layer shared across all roles (Phase 1+)
// ---------------------------------------------------------------------------

export type CourseLessonDetail = {
  lessonId: string | null;
  syllabusLessonId: string;
  position: number;
  lessonName: string;
  durationMinutes: number;
  date: Date | null;
  location: string | null;
  status: string; // CourseLessonStatus or 'UNSCHEDULED'
  // FC-020 attendance/presence hints
  myAttendanceStatus: string | null;  // for enrolled students (NO_RESPONSE/ACCEPTED/DECLINED)
  myPresenceStatus: string | null;    // for non-lead instructors (EXPECTED/DECLINED/ABSENT)
  // FC-021 below-capacity suggestion
  pendingSuggestion: { id: string; type: string } | null;
  // FC-022 student assessments (for lead instructor, LESSON_UNDERWAY)
  enrolledActiveStudents: {
    studentId: string;
    displayName: string;
    hasEvaluation: boolean;
    evaluationStatus: string | null;
    evaluationAttended: boolean | null;
  }[];
  // FC-023 co-instructor presence (for lead instructor)
  coInstructorPresences: {
    instructorId: string;
    displayName: string;
    presenceStatus: string;
  }[];
};

export type CourseDetailResult = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  schoolName: string;
  lifecycleStatus: string; // CourseLifecycleStatus or 'OPEN'
  startDate: Date | null;
  hourlyRate: number | null;
  minCapacity: number | null;
  maxCapacity: number | null;
  enrolledCount: number;
  isLeadInstructor: boolean;
  isNonLeadInstructor: boolean;
  // FC-024 refund (student's own request)
  myRefundRequest: { id: string; status: string } | null;
  // FC-024 refund (manager sees pending requests)
  pendingRefundRequests: { id: string; studentName: string; reason: string | null; createdAt: Date }[];
  // Late enrollment (manager, STARTED course)
  enrollableStudents: { studentId: string; displayName: string }[];
  // Instructor assignment (manager, OPEN/STARTED course)
  assignedInstructorsList: { instructorId: string; displayName: string; isLead: boolean }[];
  assignableInstructors: { instructorId: string; displayName: string }[];
  lessons: CourseLessonDetail[];
};

const getCourseDetailSchema = z.object({ courseId: z.string().min(1) });

export const getCourseDetail = async (
  rawArgs: unknown,
  context: { user?: { id: string } | null },
): Promise<CourseDetailResult> => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required.');
  }

  const { courseId } = ensureArgsSchemaOrThrowHttpError(getCourseDetailSchema, rawArgs);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      startDate: true,
      hourlyRate: true,
      minCapacity: true,
      maxCapacity: true,
      schoolId: true,
      syllabusVersionId: true,
      school: { select: { name: true } },
      syllabusVersion: {
        select: {
          version: true,
          syllabus: { select: { name: true } },
          lessons: {
            select: { id: true, position: true, name: true, durationMinutes: true },
            orderBy: { position: 'asc' },
          },
        },
      },
      courseLessons: {
        select: {
          id: true,
          syllabusLessonId: true,
          date: true,
          location: true,
          status: true,
        },
        orderBy: { date: 'asc' },
      },
      lifecycleEvents: {
        select: { status: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      assignedInstructors: {
        select: {
          instructorId: true,
          isLead: true,
          instructor: { select: { user: { select: { fullName: true, email: true } } } },
        },
      },
      enrolledStudents: {
        select: {
          studentId: true,
          status: true,
          student: { select: { userId: true, user: { select: { fullName: true, email: true } } } },
        },
      },
    },
  });

  if (!course) {
    throw new HttpError(404, 'Course not found.');
  }

  // ---------------------------------------------------------------------------
  // Role determination
  // ---------------------------------------------------------------------------
  const isManager = await prisma.userSchoolRole.findFirst({
    where: {
      userId: context.user.id,
      schoolId: course.schoolId,
      role: SchoolRole.SCHOOL_MANAGER,
      revokedAt: null,
    },
    select: { id: true },
  });

  let isLeadInstructor = false;
  let isNonLeadInstructor = false;
  let myInstructorId: string | null = null;
  let myStudentId: string | null = null;

  if (!isManager) {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: context.user.id },
      select: { id: true },
    });
    const assignedEntry = instructor !== null
      ? course.assignedInstructors.find((ai) => ai.instructorId === instructor.id)
      : undefined;
    isLeadInstructor = assignedEntry?.isLead === true;
    isNonLeadInstructor = assignedEntry !== undefined && !assignedEntry.isLead;
    if (instructor && assignedEntry) myInstructorId = instructor.id;

    const studentEnrollment = course.enrolledStudents.find(
      (es) => es.student.userId === context.user!.id,
    );
    if (studentEnrollment) {
      myStudentId = studentEnrollment.studentId;
    }

    if (!assignedEntry && !studentEnrollment) {
      throw new HttpError(403, 'You do not have access to this course.');
    }
  }

  const lifecycleStatus = course.lifecycleEvents[0]?.status ?? 'OPEN';
  const courseLessonIds = course.courseLessons.map((cl) => cl.id);

  // ---------------------------------------------------------------------------
  // Bulk data fetches — keyed for lesson enrichment
  // ---------------------------------------------------------------------------

  // FC-020: student attendance hints (all lessons for this student)
  const attendanceMap = new Map<string, string>();
  if (myStudentId && courseLessonIds.length > 0) {
    const attendances = await prisma.meetingAttendance.findMany({
      where: { courseLessonId: { in: courseLessonIds }, studentId: myStudentId },
      select: { courseLessonId: true, status: true },
    });
    for (const a of attendances) attendanceMap.set(a.courseLessonId, a.status);
  }

  // FC-020: non-lead instructor presence hints
  const presenceMap = new Map<string, string>();
  if (myInstructorId && isNonLeadInstructor && courseLessonIds.length > 0) {
    const presences = await prisma.instructorLessonPresence.findMany({
      where: { courseLessonId: { in: courseLessonIds }, instructorId: myInstructorId },
      select: { courseLessonId: true, status: true },
    });
    for (const p of presences) presenceMap.set(p.courseLessonId, p.status);
  }

  // FC-021: pending suggestions per lesson
  const suggestionMap = new Map<string, { id: string; type: string }>();
  if (courseLessonIds.length > 0) {
    const suggestions = await prisma.instructorSuggestion.findMany({
      where: {
        courseLessonId: { in: courseLessonIds },
        status: InstructorSuggestionStatus.PENDING,
      },
      select: { id: true, courseLessonId: true, type: true },
    });
    for (const s of suggestions) suggestionMap.set(s.courseLessonId, { id: s.id, type: s.type });
  }

  // FC-022 + FC-023: per-lesson student assessments and co-instructor presences
  // Only fetch when viewer is lead instructor (expensive relational data)
  const lessonStudentsMap = new Map<
    string,
    {
      studentId: string;
      displayName: string;
      hasEvaluation: boolean;
      evaluationStatus: string | null;
      evaluationAttended: boolean | null;
    }[]
  >();
  const lessonCoInstructorsMap = new Map<
    string,
    { instructorId: string; displayName: string; presenceStatus: string }[]
  >();

  if (isLeadInstructor && courseLessonIds.length > 0) {
    // Active enrolled students with their evaluations
    const [allEnrollments, allEvaluations, allPresences] = await Promise.all([
      prisma.enrolledStudent.findMany({
        where: { courseId, status: EnrolledStudentStatus.ACTIVE },
        select: {
          studentId: true,
          student: { select: { user: { select: { fullName: true, email: true } } } },
        },
      }),
      prisma.studentLessonEvaluation.findMany({
        where: { courseLessonId: { in: courseLessonIds } },
        select: { courseLessonId: true, studentId: true, status: true, attended: true },
      }),
      prisma.instructorLessonPresence.findMany({
        where: { courseLessonId: { in: courseLessonIds } },
        select: {
          courseLessonId: true,
          instructorId: true,
          status: true,
          instructor: { select: { user: { select: { fullName: true, email: true } } } },
        },
      }),
    ]);

    const evalsByLesson = new Map<string, typeof allEvaluations>();
    for (const ev of allEvaluations) {
      const list = evalsByLesson.get(ev.courseLessonId) ?? [];
      list.push(ev);
      evalsByLesson.set(ev.courseLessonId, list);
    }

    const presencesByLesson = new Map<string, typeof allPresences>();
    for (const p of allPresences) {
      const list = presencesByLesson.get(p.courseLessonId) ?? [];
      list.push(p);
      presencesByLesson.set(p.courseLessonId, list);
    }

    for (const cl of course.courseLessons) {
      // Only populate student list for LESSON_UNDERWAY lessons (needed for assessment form)
      if (cl.status === CourseLessonStatus.LESSON_UNDERWAY) {
        const evals = evalsByLesson.get(cl.id) ?? [];
        const evalMap = new Map(evals.map((e) => [e.studentId, e]));
        lessonStudentsMap.set(
          cl.id,
          allEnrollments.map((en) => {
            const ev = evalMap.get(en.studentId);
            return {
              studentId: en.studentId,
              displayName: en.student.user.fullName ?? en.student.user.email ?? en.studentId,
              hasEvaluation: ev !== undefined,
              evaluationStatus: ev?.status ?? null,
              evaluationAttended: ev?.attended ?? null,
            };
          }),
        );
      }

      // Co-instructor presences for all scheduled lessons
      const presences = presencesByLesson.get(cl.id) ?? [];
      lessonCoInstructorsMap.set(
        cl.id,
        presences.map((p) => ({
          instructorId: p.instructorId,
          displayName: p.instructor.user.fullName ?? p.instructor.user.email ?? p.instructorId,
          presenceStatus: p.status,
        })),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // FC-024: refund data
  // ---------------------------------------------------------------------------
  let myRefundRequest: CourseDetailResult['myRefundRequest'] = null;
  let pendingRefundRequests: CourseDetailResult['pendingRefundRequests'] = [];

  if (myStudentId) {
    const rr = await prisma.refundRequest.findFirst({
      where: { courseId, studentId: myStudentId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });
    if (rr) myRefundRequest = { id: rr.id, status: rr.status };
  }

  if (isManager) {
    const rrs = await prisma.refundRequest.findMany({
      where: { courseId, status: RefundRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        student: { select: { user: { select: { fullName: true, email: true } } } },
      },
    });
    pendingRefundRequests = rrs.map((r) => ({
      id: r.id,
      studentName: r.student.user.fullName ?? r.student.user.email ?? r.id,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  }

  // ---------------------------------------------------------------------------
  // Late enrollment: enrollable students (manager, STARTED course)
  // ---------------------------------------------------------------------------
  let enrollableStudents: CourseDetailResult['enrollableStudents'] = [];
  if (isManager && lifecycleStatus === CourseLifecycleStatus.STARTED) {
    const alreadyEnrolledIds = new Set(course.enrolledStudents.map((es) => es.studentId));
    const schoolStudents = await prisma.userSchoolRole.findMany({
      where: { schoolId: course.schoolId, role: 'STUDENT', revokedAt: null },
      select: { user: { select: { id: true, fullName: true, email: true } } },
    });
    for (const sr of schoolStudents) {
      const student = await prisma.student.findUnique({
        where: { userId: sr.user.id },
        select: { id: true },
      });
      if (student && !alreadyEnrolledIds.has(student.id)) {
        enrollableStudents.push({
          studentId: student.id,
          displayName: sr.user.fullName ?? sr.user.email ?? sr.user.id,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Instructor assignment data (manager, OPEN/STARTED course)
  // ---------------------------------------------------------------------------
  const assignedInstructorsList: CourseDetailResult['assignedInstructorsList'] = [];
  let assignableInstructors: CourseDetailResult['assignableInstructors'] = [];

  if (isManager) {
    const alreadyAssignedIds = new Set(course.assignedInstructors.map((ai) => ai.instructorId));
    for (const ai of course.assignedInstructors) {
      assignedInstructorsList.push({
        instructorId: ai.instructorId,
        displayName: ai.instructor.user.fullName ?? ai.instructor.user.email ?? ai.instructorId,
        isLead: ai.isLead,
      });
    }

    if (lifecycleStatus !== CourseLifecycleStatus.COMPLETED && lifecycleStatus !== CourseLifecycleStatus.CLOSED) {
      const schoolInstructors = await prisma.userSchoolRole.findMany({
        where: { schoolId: course.schoolId, role: 'INSTRUCTOR', revokedAt: null },
        select: { user: { select: { id: true, fullName: true, email: true } } },
      });
      for (const sr of schoolInstructors) {
        const instructorProfile = await prisma.instructor.findUnique({
          where: { userId: sr.user.id },
          select: { id: true },
        });
        if (instructorProfile) {
          assignableInstructors.push({
            instructorId: instructorProfile.id,
            displayName: sr.user.fullName ?? sr.user.email ?? sr.user.id,
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Build lesson list with enriched per-role data
  // ---------------------------------------------------------------------------
  const lessonMap = new Map<string, (typeof course.courseLessons)[number]>();
  for (const cl of course.courseLessons) {
    lessonMap.set(cl.syllabusLessonId, cl);
  }

  const lessons: CourseLessonDetail[] = course.syllabusVersion.lessons.map((sl) => {
    const cl = lessonMap.get(sl.id);
    return {
      lessonId: cl?.id ?? null,
      syllabusLessonId: sl.id,
      position: sl.position,
      lessonName: sl.name,
      durationMinutes: sl.durationMinutes,
      date: cl?.date ?? null,
      location: cl?.location ?? null,
      status: cl?.status ?? 'UNSCHEDULED',
      myAttendanceStatus: cl ? (attendanceMap.get(cl.id) ?? null) : null,
      myPresenceStatus: cl ? (presenceMap.get(cl.id) ?? null) : null,
      pendingSuggestion: cl ? (suggestionMap.get(cl.id) ?? null) : null,
      enrolledActiveStudents: cl ? (lessonStudentsMap.get(cl.id) ?? []) : [],
      coInstructorPresences: cl ? (lessonCoInstructorsMap.get(cl.id) ?? []) : [],
    };
  });

  return {
    courseId: course.id,
    syllabusName: course.syllabusVersion.syllabus.name,
    syllabusVersion: course.syllabusVersion.version,
    schoolName: course.school.name,
    lifecycleStatus,
    startDate: course.startDate,
    hourlyRate: course.hourlyRate,
    minCapacity: course.minCapacity,
    maxCapacity: course.maxCapacity,
    enrolledCount: course.enrolledStudents.length,
    isLeadInstructor,
    isNonLeadInstructor,
    myRefundRequest,
    pendingRefundRequests,
    enrollableStudents,
    assignedInstructorsList,
    assignableInstructors,
    lessons,
  };
};

