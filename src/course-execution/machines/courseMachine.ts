/**
 * Course Lifecycle — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §1
 */
import { setup, and } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CourseLifecycleStatus = 'OPEN' | 'STARTED' | 'COMPLETED' | 'CLOSED';

export interface CourseMachineContext {
  // Hard start guards (all must pass — blocking)
  assignedInstructorCount: number;
  hasExactlyOneLead: boolean;
  hourlyRateSet: boolean;
  allInstructorsHaveWage: boolean;
  // Soft start guard — manager may override (INV-01)
  enrolledCount: number;
  minCapacity: number | null;
  // Completion guard — system checks after each assessment (INV-08)
  allStudentsResolved: boolean;
  // Close-via-suggestion guard (STARTED → CLOSED via APPROVE_CLOSE_SUGGESTION)
  hasPendingCloseSuggestion: boolean;
  // INV-22: A course may only be started once — CLOSED→REOPENED cancels this flag
  hasStartedBefore: boolean;
}

export type CourseEvent =
  | { type: 'START_COURSE'; overrideCapacity?: boolean }
  | { type: 'ALL_STUDENTS_RESOLVED' }
  | { type: 'APPROVE_CLOSE_SUGGESTION' }
  | { type: 'CLOSE_COURSE' }
  | { type: 'REOPEN_COURSE' };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const courseMachine = setup({
  types: {
    context: {} as CourseMachineContext,
    events: {} as CourseEvent,
    input: {} as CourseMachineContext,
  },

  guards: {
    /**
     * All four hard prerequisites for starting a course must be satisfied.
     * These cannot be overridden.
     */
    hardStartGuardsPassed: ({ context }) =>
      context.assignedInstructorCount >= 1 &&
      context.hasExactlyOneLead &&
      context.hourlyRateSet &&
      context.allInstructorsHaveWage,

    /**
     * Capacity soft guard: passes if minCapacity is null, enrolledCount meets
     * the minimum, or the manager explicitly overrides (INV-01 soft).
     */
    softCapacityOk: ({ context, event }) =>
      event.type === 'START_COURSE' &&
      (context.minCapacity === null ||
        context.enrolledCount >= context.minCapacity ||
        event.overrideCapacity === true),

    /** All enrolled students have CERTIFIED or FAILED status (INV-08). */
    allStudentsResolved: ({ context }) => context.allStudentsResolved,

    /** An active CLOSE_COURSE InstructorSuggestion exists. */
    hasPendingCloseSuggestion: ({ context }) => context.hasPendingCloseSuggestion,

    /** INV-22: Course may only be started once across its full lifecycle. */
    noPriorStart: ({ context }) => !context.hasStartedBefore,
  },

  actions: {
    appendStartedEvent: () => {},
    chargeEnrolledStudents: () => {},
    appendCompletedEvent: () => {},
    cancelActiveLesson: () => {},
    appendClosedEvent: () => {},
    appendReopenedEvent: () => {},
    markSuggestionApproved: () => {},
  },
}).createMachine({
  id: 'course',
  context: ({ input }) => ({ ...input }),
  initial: 'OPEN',

  states: {
    /**
     * Course is open for enrollment. No CourseLifecycleEvent or most-recent
     * event is REOPENED.
     */
    OPEN: {
      on: {
        START_COURSE: {
          guard: and(['hardStartGuardsPassed', 'softCapacityOk', 'noPriorStart']),
          target: 'STARTED',
          actions: ['appendStartedEvent', 'chargeEnrolledStudents'],
        },
        CLOSE_COURSE: {
          target: 'CLOSED',
          actions: ['appendClosedEvent'],
        },
      },
    },

    /**
     * Course is running. Lessons are delivered sequentially.
     */
    STARTED: {
      on: {
        ALL_STUDENTS_RESOLVED: {
          guard: 'allStudentsResolved',
          target: 'COMPLETED',
          actions: ['appendCompletedEvent', 'cancelActiveLesson'],
        },
        APPROVE_CLOSE_SUGGESTION: {
          guard: 'hasPendingCloseSuggestion',
          target: 'CLOSED',
          actions: ['markSuggestionApproved', 'appendClosedEvent', 'cancelActiveLesson'],
        },
        CLOSE_COURSE: {
          target: 'CLOSED',
          actions: ['appendClosedEvent', 'cancelActiveLesson'],
        },
      },
    },

    /** All students resolved. Terminal — no transitions out. */
    COMPLETED: {
      type: 'final',
    },

    /**
     * Course closed by manager (directly or via suggestion).
     * Can be reopened.
     */
    CLOSED: {
      on: {
        REOPEN_COURSE: {
          target: 'OPEN',
          actions: ['appendReopenedEvent'],
        },
      },
    },
  },
});
