/**
 * Course execution operations — Slice 1 (Course Lifecycle) + Slice 3 (Lesson Scheduling).
 *
 * Guard logic mirrors the corresponding XState machines in
 * src/course-execution/machines/. This file owns the DB restore + effect layers.
 */
import {
  CourseLessonStatus,
  CourseLifecycleStatus,
  EnrolledStudentStatus,
  InstructorLessonPresenceStatus,
  InstructorSuggestionStatus,
  MeetingAttendanceStatus,
  SchoolRole,
} from '@prisma/client';
import { HttpError, prisma } from 'wasp/server';
import * as z from 'zod';

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
      minCapacity: true,
      assignedInstructors: {
        select: { instructorId: true, isLead: true, agreedWagePerHour: true },
      },
      enrolledStudents: { select: { studentId: true } },
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
  await prisma.courseLifecycleEvent.create({
    data: {
      courseId: course.id,
      changedByUserId: user.id,
      status: CourseLifecycleStatus.STARTED,
    },
  });

  // TODO Slice 5: chargeEnrolledStudents — debit each enrolled student's account
  // for the full course fee (sum(syllabusLesson.durationMinutes) / 60 × hourlyRate).

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

