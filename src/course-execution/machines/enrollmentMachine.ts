/**
 * Student Enrollment Status — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §6
 *
 * One EnrolledStudent row per (student, course).
 * CERTIFIED and FAILED are terminal. To continue training after FAILED,
 * the student must enroll in a new course.
 */
import { setup, and, not } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnrolledStudentStatus = 'ACTIVE' | 'CERTIFIED' | 'FAILED';

export interface EnrollmentMachineContext {
  /**
   * True when this is the student's final lesson in the course syllabus.
   * A PASS on the final lesson triggers CERTIFIED.
   */
  isFinalLesson: boolean;
}

export type EnrollmentEvent = {
  type: 'ASSESSMENT_SUBMITTED';
  /** PASS or FAIL result of the lead instructor's evaluation. */
  result: 'PASS' | 'FAIL';
  /**
   * Whether the student physically attended.
   * INV-15: attended=false must have result=FAIL.
   * attended=false with result=PASS is treated as FAIL by the machine.
   */
  attended: boolean;
};

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const enrollmentMachine = setup({
  types: {
    context: {} as EnrollmentMachineContext,
    events: {} as EnrollmentEvent,
    input: {} as EnrollmentMachineContext,
  },

  guards: {
    /**
     * Student passed and was physically present (INV-15).
     * attended=false with result=PASS is caught by isFail guard below.
     */
    isPass: ({ event }) =>
      event.type === 'ASSESSMENT_SUBMITTED' && event.result === 'PASS' && event.attended === true,

    /**
     * Student failed or was absent.
     * INV-15: attended=false always implies FAIL regardless of stated result.
     */
    isFail: ({ event }) =>
      event.type === 'ASSESSMENT_SUBMITTED' &&
      (event.result === 'FAIL' || event.attended === false),

    isFinalLesson: ({ context }) => context.isFinalLesson,
  },

  actions: {
    setCertified: () => {},
    setFailed: () => {},
    notifyManagerAndInstructor: () => {},
    triggerCourseCompletionCheck: () => {},
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcD2AbLBbVALgHQCCAwgCoCSAagKIDEJAys3awLJ0ByFA+swCqAIQ5UKFOgBEA2gAYAuolAAHDLACWBDRhTKQAD0QAWAIwBmIgHYAbACYArKYdXzx81bsAOKwBoQAJ6IXqZEdgCckeFWLuHGdvbhAL5J-qiYOPgoxOTU9Eys7MxcvAIiYhLSMqZKSCBqmtq6+kYI8f5BCKbhdkTOXuZ2CXL2xsYxKWno2HiEpJS0jCxsnDz8QqLikrJ2tarqWjp6da1mlraOzq7unj4diHZylsZRXk7GNnIDXympICgYCBwfTpGZZAj6BqHZonRAAWhs9wQCMm4GmmTmuUWkIOTWOoFaphsViIX1MjispisbysclMXiRdg+RDeAzspg+4RsDm8XlRoIx2SIZDoACVqAAxKjSHGNI4tRDU8KkmJyOQ8+JmVxI0xEojmKJxYxeLzhDxvfno2ZCiUkKgAGRldSheIVCCVKocao1TKp5kZPNJTPCPjG4w5XmMvySQA */
  id: 'enrollment',
  context: ({ input }) => ({ ...input }),
  initial: 'ACTIVE',

  states: {
    /**
     * Student is actively enrolled. Assessments gate transitions to terminal states.
     */
    ACTIVE: {
      on: {
        ASSESSMENT_SUBMITTED: [
          // PASS on final lesson → CERTIFIED
          {
            guard: and(['isPass', 'isFinalLesson']),
            target: 'CERTIFIED',
            actions: ['setCertified', 'triggerCourseCompletionCheck'],
          },
          // PASS on non-final lesson → stays ACTIVE (progress recorded as side effect)
          {
            guard: and(['isPass', not('isFinalLesson')]),
            target: 'ACTIVE',
          },
          // FAIL or absent (INV-15) → FAILED, immediately excluded from future lessons
          {
            guard: 'isFail',
            target: 'FAILED',
            actions: ['setFailed', 'notifyManagerAndInstructor', 'triggerCourseCompletionCheck'],
          },
        ],
      },
    },

    /** Student completed all lessons with PASS. Terminal. */
    CERTIFIED: { type: 'final' },

    /**
     * Student failed a lesson or was absent. Terminal for this enrollment.
     * Manager decides: re-enroll in new course or issue refund.
     */
    FAILED: { type: 'final' },
  },
});
