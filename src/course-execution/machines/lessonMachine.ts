/**
 * Lesson Scheduling Lifecycle — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §2 + §4 (InstructorSuggestion
 * contribution to BELOW_CAPACITY transitions).
 *
 * Design contract:
 *  - All guards operate on plain context (no I/O).
 *  - All actions are declared names only; implementations are injected at the
 *    effect executor layer (Wasp action / cron handler).
 *  - DB state is loaded into `LessonMachineContext` before the actor is
 *    constructed; the machine never touches Prisma directly.
 */
import { setup, assign, and } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CourseLifecycleStatus = 'OPEN' | 'STARTED' | 'COMPLETED' | 'CLOSED';

export type CourseLessonStatus =
  | 'UNSCHEDULED'
  | 'SCHEDULED'
  | 'BELOW_CAPACITY'
  | 'CONFIRMED'
  | 'LESSON_UNDERWAY'
  | 'LESSON_CONCLUDED'
  | 'CANCELLED';

export type InstructorSuggestionType = 'PROCEED_WITH_PARTIAL' | 'CLOSE_COURSE';

/**
 * All data the machine needs to evaluate guards.
 * Populated from DB by the context loader (effect layer) before actor creation.
 */
export interface LessonMachineContext {
  /** Current lifecycle status of the parent course. */
  courseStatus: CourseLifecycleStatus;
  /** Minimum required accepted attendees; null = no minimum enforced. */
  minCapacity: number | null;
  /** Count of MeetingAttendance rows in ACCEPTED state for this lesson. */
  acceptedCount: number;
  /** Count of EnrolledStudent rows in ACTIVE state for this course. */
  activeStudentCount: number;
  /** True when CourseLesson.date has been reached (now >= lesson date). */
  lessonDateReached: boolean;
  /**
   * True when the proposed schedule overlaps a CONFIRMED or LESSON_UNDERWAY
   * CourseLesson for any course this lead instructor is assigned to.
   * Pre-computed by the context loader via a DB query.
   */
  hasScheduleOverlap: boolean;
  /**
   * Type of the currently active (non-superseded) InstructorSuggestion for
   * this lesson, or null if none exists.
   */
  pendingSuggestionType: InstructorSuggestionType | null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type LessonEvent =
  | { type: 'SCHEDULE' }
  | { type: 'RESCHEDULE' }
  | { type: 'ATTENDANCE_CHECK' }
  | { type: 'SUBMIT_SUGGESTION'; suggestionType: InstructorSuggestionType }
  | { type: 'APPROVE_PROCEED_WITH_PARTIAL' }
  | { type: 'LESSON_DATE_REACHED' }
  | { type: 'ALL_ASSESSMENTS_SUBMITTED' }
  | { type: 'CANCEL' };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const lessonMachine = setup({
  types: {
    context: {} as LessonMachineContext,
    events: {} as LessonEvent,
    input: {} as LessonMachineContext,
  },

  guards: {
    /** Course must be STARTED before any lesson scheduling action. */
    courseIsStarted: ({ context }) => context.courseStatus === 'STARTED',

    /** Reschedule from CONFIRMED is only allowed before the lesson date. */
    lessonDateNotReached: ({ context }) => !context.lessonDateReached,

    /**
     * No time-range overlap with any CONFIRMED/LESSON_UNDERWAY lesson
     * the lead instructor is assigned to across all courses.
     * Pre-computed by context loader.
     */
    noScheduleOverlap: ({ context }) => !context.hasScheduleOverlap,

    /**
     * Accepted attendees count meets or exceeds minimum capacity.
     * null minCapacity = always passes (INV-01 soft guard).
     */
    capacityMet: ({ context }) =>
      context.minCapacity === null || context.acceptedCount >= context.minCapacity,

    /**
     * Accepted attendees count is strictly below minimum capacity.
     * Only fires when minCapacity is set.
     */
    capacityNotMet: ({ context }) =>
      context.minCapacity !== null && context.acceptedCount < context.minCapacity,

    /**
     * A PROCEED_WITH_PARTIAL suggestion is pending — required before manager
     * can approve it (INV-06).
     */
    hasProceedWithPartialSuggestion: ({ context }) =>
      context.pendingSuggestionType === 'PROCEED_WITH_PARTIAL',
  },

  actions: {
    // Stub implementations — real I/O injected at the effect executor layer.
    createMeetingAttendanceRecords: () => {},
    createInstructorPresenceRecords: () => {},
    resetMeetingAttendanceRecords: () => {},
    resetInstructorPresenceRecords: () => {},
    supersedePendingSuggestion: () => {},
    logNotification: () => {},
    createInstructorSuggestion: () => {},
    payAttendingInstructors: () => {},
    advanceCoursePointer: () => {},
    checkCourseCompletion: () => {},

    /** Persist the suggestion type into context so approval guard can read it. */
    recordSuggestionType: assign({
      pendingSuggestionType: ({ event }) =>
        event.type === 'SUBMIT_SUGGESTION' ? event.suggestionType : null,
    }),

    /** Clear suggestion type when superseded or approved. */
    clearSuggestionType: assign({ pendingSuggestionType: null }),
  },
}).createMachine({
  id: 'lesson',
  context: ({ input }) => ({ ...input }),
  initial: 'UNSCHEDULED',

  states: {
    /**
     * Implicit state — no CourseLesson row exists yet.
     * Entered when a course is STARTED and a new syllabus position has no row.
     */
    UNSCHEDULED: {
      on: {
        SCHEDULE: {
          guard: and(['courseIsStarted', 'noScheduleOverlap']),
          target: 'SCHEDULED',
          actions: [
            'createMeetingAttendanceRecords',
            'createInstructorPresenceRecords',
            'logNotification',
          ],
        },
      },
    },

    /**
     * CourseLesson row created; awaiting attendance-check cron.
     */
    SCHEDULED: {
      on: {
        RESCHEDULE: {
          guard: and(['courseIsStarted', 'noScheduleOverlap']),
          target: 'SCHEDULED',
          actions: [
            'resetMeetingAttendanceRecords',
            'resetInstructorPresenceRecords',
            'supersedePendingSuggestion',
            'clearSuggestionType',
            'logNotification',
          ],
        },
        ATTENDANCE_CHECK: [
          {
            guard: 'capacityMet',
            target: 'CONFIRMED',
            actions: ['logNotification'],
          },
          {
            guard: 'capacityNotMet',
            target: 'BELOW_CAPACITY',
            actions: ['logNotification'],
          },
        ],
        CANCEL: { target: 'CANCELLED' },
      },
    },

    /**
     * Attendance check fired but accepted count was below minCapacity.
     * Lead instructor must either reschedule, propose proceeding with partial
     * group, or suggest closing the course.
     */
    BELOW_CAPACITY: {
      on: {
        RESCHEDULE: {
          guard: 'noScheduleOverlap',
          target: 'SCHEDULED',
          actions: [
            'resetMeetingAttendanceRecords',
            'resetInstructorPresenceRecords',
            'supersedePendingSuggestion',
            'clearSuggestionType',
          ],
        },
        /**
         * Internal transition — lesson status unchanged; creates suggestion.
         * Context records suggestion type so approval guard can read it.
         */
        SUBMIT_SUGGESTION: {
          actions: ['recordSuggestionType', 'createInstructorSuggestion', 'logNotification'],
        },
        APPROVE_PROCEED_WITH_PARTIAL: {
          guard: 'hasProceedWithPartialSuggestion',
          target: 'CONFIRMED',
          actions: ['clearSuggestionType'],
        },
        CANCEL: { target: 'CANCELLED' },
      },
    },

    /**
     * Capacity requirement met (or null). Lesson will proceed on schedule.
     * Lead instructor may still reschedule before the lesson date.
     */
    CONFIRMED: {
      on: {
        RESCHEDULE: {
          guard: and(['courseIsStarted', 'lessonDateNotReached', 'noScheduleOverlap']),
          target: 'SCHEDULED',
          actions: [
            'resetMeetingAttendanceRecords',
            'resetInstructorPresenceRecords',
            'logNotification',
          ],
        },
        LESSON_DATE_REACHED: { target: 'LESSON_UNDERWAY' },
        CANCEL: { target: 'CANCELLED' },
      },
    },

    /**
     * Lesson date has been reached; lead instructor submits student assessments.
     */
    LESSON_UNDERWAY: {
      on: {
        ALL_ASSESSMENTS_SUBMITTED: {
          target: 'LESSON_CONCLUDED',
          actions: ['payAttendingInstructors', 'advanceCoursePointer', 'checkCourseCompletion'],
        },
      },
    },

    /** All assessments submitted; financial settlement triggered. Terminal. */
    LESSON_CONCLUDED: {
      type: 'final',
    },

    /** Lesson cancelled (course closed/completed before lesson ran). Terminal. */
    CANCELLED: {
      type: 'final',
    },
  },
});
