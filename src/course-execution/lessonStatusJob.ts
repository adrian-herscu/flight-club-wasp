/**
 * lessonStatusJobHandler — Wasp PgBoss recurring job (cron: every minute).
 *
 * Drives two automatic status transitions for CourseLesson:
 *   1. SCHEDULED → CONFIRMED or BELOW_CAPACITY  (when lesson date is reached)
 *   2. CONFIRMED → LESSON_UNDERWAY               (when lesson date is reached)
 *
 * The handler uses `prisma` from `wasp/server` directly (not context.entities)
 * so it can be imported and called in API tests via the vitest alias for
 * `wasp/server`.
 *
 * State machine reference: docs/course-state-machine.md §2
 */
import { CourseLessonStatus, MeetingAttendanceStatus } from '@prisma/client';
import { prisma } from 'wasp/server';

export const lessonStatusJobHandler = async (
  _args: Record<string, never>,
  _context: unknown,
): Promise<void> => {
  const now = new Date();

  // 1. SCHEDULED → CONFIRMED or BELOW_CAPACITY
  //    Fires when attendance check date is reached (CourseLesson.date <= now).
  const scheduledLessons = await prisma.courseLesson.findMany({
    where: {
      status: CourseLessonStatus.SCHEDULED,
      date: { lte: now },
    },
    select: {
      id: true,
      course: { select: { minCapacity: true } },
    },
  });

  for (const lesson of scheduledLessons) {
    const acceptedCount = await prisma.meetingAttendance.count({
      where: { courseLessonId: lesson.id, status: MeetingAttendanceStatus.ACCEPTED },
    });
    const minCapacity = lesson.course.minCapacity;
    const capacityMet = minCapacity == null || acceptedCount >= minCapacity;
    const newStatus = capacityMet ? CourseLessonStatus.CONFIRMED : CourseLessonStatus.BELOW_CAPACITY;

    await prisma.courseLesson.update({
      where: { id: lesson.id },
      data: { status: newStatus },
    });
  }

  // 2. CONFIRMED → LESSON_UNDERWAY
  //    Fires when the lesson datetime is reached.
  await prisma.courseLesson.updateMany({
    where: {
      status: CourseLessonStatus.CONFIRMED,
      date: { lte: now },
    },
    data: { status: CourseLessonStatus.LESSON_UNDERWAY },
  });
};
