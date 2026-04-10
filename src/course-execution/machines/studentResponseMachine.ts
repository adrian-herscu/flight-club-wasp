/**
 * Student Lesson Response — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §3
 *
 * One MeetingAttendance row per (student, CourseLesson).
 * Responses are advisory hints only — they never change CourseLesson.status.
 * Freely togglable in any direction until CourseLesson.date is reached (INV-09).
 */
import { setup } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MeetingAttendanceStatus = 'NO_RESPONSE' | 'ACCEPTED' | 'DECLINED';

export interface StudentResponseContext {
  /** True when CourseLesson.date has been reached — locks all toggling (INV-09). */
  lessonDateReached: boolean;
}

export type StudentResponseEvent =
  | { type: 'ACCEPT' }
  | { type: 'DECLINE' }
  /** Fired by system when lead instructor reschedules the lesson. */
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const studentResponseMachine = setup({
  types: {
    context: {} as StudentResponseContext,
    events: {} as StudentResponseEvent,
    input: {} as StudentResponseContext,
  },

  guards: {
    dateNotReached: ({ context }) => !context.lessonDateReached,
  },

  actions: {
    notifyLeadInstructor: () => {},
  },
}).createMachine({
  id: 'studentResponse',
  context: ({ input }) => ({ ...input }),
  initial: 'NO_RESPONSE',

  states: {
    NO_RESPONSE: {
      on: {
        ACCEPT: {
          guard: 'dateNotReached',
          target: 'ACCEPTED',
          actions: ['notifyLeadInstructor'],
        },
        DECLINE: {
          guard: 'dateNotReached',
          target: 'DECLINED',
          actions: ['notifyLeadInstructor'],
        },
        RESET: { target: 'NO_RESPONSE' },
      },
    },

    ACCEPTED: {
      on: {
        // Re-accept is a no-op but explicit per "any → ACCEPTED" spec.
        ACCEPT: { guard: 'dateNotReached', target: 'ACCEPTED' },
        DECLINE: {
          guard: 'dateNotReached',
          target: 'DECLINED',
          actions: ['notifyLeadInstructor'],
        },
        RESET: { target: 'NO_RESPONSE' },
      },
    },

    DECLINED: {
      on: {
        ACCEPT: {
          guard: 'dateNotReached',
          target: 'ACCEPTED',
          actions: ['notifyLeadInstructor'],
        },
        // Re-decline is a no-op but explicit per "any → DECLINED" spec.
        DECLINE: { guard: 'dateNotReached', target: 'DECLINED' },
        RESET: { target: 'NO_RESPONSE' },
      },
    },
  },
});
