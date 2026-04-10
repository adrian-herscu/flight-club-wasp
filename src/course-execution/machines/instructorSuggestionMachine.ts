/**
 * Instructor Suggestion (Below Capacity) — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §4
 *
 * At most one active InstructorSuggestion per CourseLesson (INV-06).
 * Submitted by lead instructor when lesson is BELOW_CAPACITY, reviewed by manager.
 */
import { setup, and } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InstructorSuggestionStatus =
  | 'NONE'
  | 'PROCEED_WITH_PARTIAL'
  | 'CLOSE_COURSE'
  | 'APPROVED'
  | 'SUPERSEDED';

export interface InstructorSuggestionContext {
  /**
   * Current CourseLesson.status — submissions only allowed while BELOW_CAPACITY.
   */
  lessonStatus: string;
  /**
   * Current Course lifecycle status — approval only allowed while STARTED.
   */
  courseStatus: string;
  /**
   * True when at least one MeetingAttendance is ACCEPTED.
   * Required for PROCEED_WITH_PARTIAL submission.
   */
  hasAcceptedStudent: boolean;
}

export type InstructorSuggestionEvent =
  | { type: 'SUBMIT_PROCEED_WITH_PARTIAL' }
  | { type: 'SUBMIT_CLOSE_COURSE' }
  | { type: 'APPROVE' }
  | { type: 'SUPERSEDE' };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const instructorSuggestionMachine = setup({
  types: {
    context: {} as InstructorSuggestionContext,
    events: {} as InstructorSuggestionEvent,
    input: {} as InstructorSuggestionContext,
  },

  guards: {
    lessonIsBelowCapacity: ({ context }) => context.lessonStatus === 'BELOW_CAPACITY',
    courseIsStarted: ({ context }) => context.courseStatus === 'STARTED',
    hasAcceptedStudent: ({ context }) => context.hasAcceptedStudent,
  },

  actions: {
    createSuggestionRecord: () => {},
    logNotification: () => {},
  },
}).createMachine({
  id: 'instructorSuggestion',
  context: ({ input }) => ({ ...input }),
  initial: 'NONE',

  states: {
    /** No suggestion exists for this lesson. */
    NONE: {
      on: {
        SUBMIT_PROCEED_WITH_PARTIAL: {
          // Requires BELOW_CAPACITY AND at least one ACCEPTED student.
          guard: and(['lessonIsBelowCapacity', 'hasAcceptedStudent']),
          target: 'PROCEED_WITH_PARTIAL',
          actions: ['createSuggestionRecord', 'logNotification'],
        },
        SUBMIT_CLOSE_COURSE: {
          guard: 'lessonIsBelowCapacity',
          target: 'CLOSE_COURSE',
          actions: ['createSuggestionRecord', 'logNotification'],
        },
      },
    },

    /**
     * Lead instructor suggests proceeding with the students who accepted.
     * Manager approval advances lesson to CONFIRMED.
     */
    PROCEED_WITH_PARTIAL: {
      on: {
        APPROVE: {
          guard: 'courseIsStarted',
          target: 'APPROVED',
        },
        SUPERSEDE: { target: 'SUPERSEDED' },
      },
    },

    /**
     * Lead instructor suggests closing the course due to insufficient attendance.
     * Manager approval closes the course.
     */
    CLOSE_COURSE: {
      on: {
        APPROVE: {
          guard: 'courseIsStarted',
          target: 'APPROVED',
        },
        SUPERSEDE: { target: 'SUPERSEDED' },
      },
    },

    /** Manager approved the suggestion. Terminal. */
    APPROVED: { type: 'final' },

    /** Lead instructor rescheduled the lesson, superseding the suggestion. Terminal. */
    SUPERSEDED: { type: 'final' },
  },
});
