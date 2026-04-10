/**
 * Instructor Lesson Presence — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §5
 *
 * One InstructorLessonPresence row per (non-lead instructor, CourseLesson).
 * Non-lead responses are advisory hints — freely togglable until lesson date (INV-09).
 * ABSENT is a deliberate lead instructor decision (not auto-set) and has
 * financial consequences at LESSON_CONCLUDED (INV-20).
 */
import { setup } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InstructorPresenceStatus = 'EXPECTED' | 'DECLINED' | 'ABSENT';

export interface InstructorPresenceContext {
  /** True when CourseLesson.date has been reached — locks all toggling (INV-09). */
  lessonDateReached: boolean;
}

export type InstructorPresenceEvent =
  /** Non-lead instructor reports they cannot attend. */
  | { type: 'REPORT_UNAVAILABLE' }
  /** Non-lead instructor confirms or re-confirms availability. */
  | { type: 'CONFIRM_AVAILABLE' }
  /**
   * Lead instructor marks the non-lead as definitively absent (proceed without).
   * Only available from DECLINED state — requires prior explicit unavailability signal.
   */
  | { type: 'MARK_ABSENT' };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const instructorPresenceMachine = setup({
  types: {
    context: {} as InstructorPresenceContext,
    events: {} as InstructorPresenceEvent,
    input: {} as InstructorPresenceContext,
  },

  guards: {
    dateNotReached: ({ context }) => !context.lessonDateReached,
  },

  actions: {
    notifyLeadAndManager: () => {},
    notifyLeadInstructor: () => {},
    notifyManager: () => {},
  },
}).createMachine({
  id: 'instructorPresence',
  context: ({ input }) => ({ ...input }),
  initial: 'EXPECTED',

  states: {
    /**
     * Row created on lesson schedule/reschedule — default state.
     * Non-lead is expected to attend.
     */
    EXPECTED: {
      on: {
        REPORT_UNAVAILABLE: {
          guard: 'dateNotReached',
          target: 'DECLINED',
          actions: ['notifyLeadAndManager'],
        },
        // "any → EXPECTED": from EXPECTED this is a no-op self-transition.
        CONFIRM_AVAILABLE: { guard: 'dateNotReached', target: 'EXPECTED' },
      },
    },

    /**
     * Non-lead has indicated they cannot attend (advisory hint).
     * Lead instructor can mark them ABSENT or wait for them to re-confirm.
     */
    DECLINED: {
      on: {
        CONFIRM_AVAILABLE: {
          guard: 'dateNotReached',
          target: 'EXPECTED',
          actions: ['notifyLeadInstructor'],
        },
        // "any → DECLINED": from DECLINED this is a no-op self-transition.
        REPORT_UNAVAILABLE: { guard: 'dateNotReached', target: 'DECLINED' },
        /**
         * Lead instructor decides to proceed without this instructor.
         * Only available from DECLINED — MARK_ABSENT requires a prior
         * explicit unavailability signal from the non-lead (doc §5).
         */
        MARK_ABSENT: {
          guard: 'dateNotReached',
          target: 'ABSENT',
          actions: ['notifyManager'],
        },
      },
    },

    /**
     * Lead instructor has confirmed this non-lead will not attend.
     * Financial consequence: excluded from LESSON_CONCLUDED pay (INV-20).
     * Non-lead can still toggle their own hint (advisory model).
     */
    ABSENT: {
      on: {
        REPORT_UNAVAILABLE: {
          guard: 'dateNotReached',
          target: 'DECLINED',
          actions: ['notifyLeadAndManager'],
        },
        CONFIRM_AVAILABLE: {
          guard: 'dateNotReached',
          target: 'EXPECTED',
          actions: ['notifyLeadInstructor'],
        },
      },
    },
  },
});
