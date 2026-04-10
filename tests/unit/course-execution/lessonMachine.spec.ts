/**
 * Lesson machine — pure unit tests.
 *
 * No database, no Prisma, no Wasp. Every test creates an XState actor with
 * a synthetic context and asserts the resulting state value.
 *
 * Transition IDs map to docs/course-state-machine.md §2.
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  lessonMachine,
  type LessonMachineContext,
} from '../../../src/course-execution/machines/lessonMachine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default context satisfying all guards: started course, capacity null, no overlap. */
function ctx(overrides: Partial<LessonMachineContext> = {}): LessonMachineContext {
  return {
    courseStatus: 'STARTED',
    minCapacity: null,
    acceptedCount: 0,
    activeStudentCount: 3,
    lessonDateReached: false,
    hasScheduleOverlap: false,
    pendingSuggestionType: null,
    ...overrides,
  };
}

/**
 * Creates an actor with the machine restored to the given state value and
 * context, then starts it.
 */
function actorAt(stateValue: string, context: LessonMachineContext) {
  const snapshot = lessonMachine.resolveState({ value: stateValue, context });
  const actor = createActor(lessonMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §2 — UNSCHEDULED
// ---------------------------------------------------------------------------

describe('UNSCHEDULED', () => {
  it('SCHEDULE with valid context → SCHEDULED', () => {
    const actor = actorAt('UNSCHEDULED', ctx());
    actor.send({ type: 'SCHEDULE' });
    expect(actor.getSnapshot().value).toBe('SCHEDULED');
  });

  it('SCHEDULE when course not STARTED → stays UNSCHEDULED', () => {
    const actor = actorAt('UNSCHEDULED', ctx({ courseStatus: 'OPEN' }));
    actor.send({ type: 'SCHEDULE' });
    expect(actor.getSnapshot().value).toBe('UNSCHEDULED');
  });

  it('SCHEDULE when schedule overlap exists → stays UNSCHEDULED', () => {
    const actor = actorAt('UNSCHEDULED', ctx({ hasScheduleOverlap: true }));
    actor.send({ type: 'SCHEDULE' });
    expect(actor.getSnapshot().value).toBe('UNSCHEDULED');
  });
});

// ---------------------------------------------------------------------------
// §2 — SCHEDULED
// ---------------------------------------------------------------------------

describe('SCHEDULED', () => {
  it('RESCHEDULE with valid context → stays SCHEDULED (self-transition)', () => {
    const actor = actorAt('SCHEDULED', ctx());
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('SCHEDULED');
  });

  it('RESCHEDULE when course not STARTED → stays SCHEDULED', () => {
    const actor = actorAt('SCHEDULED', ctx({ courseStatus: 'CLOSED' }));
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('SCHEDULED');
  });

  it('RESCHEDULE when schedule overlap → stays SCHEDULED', () => {
    const actor = actorAt('SCHEDULED', ctx({ hasScheduleOverlap: true }));
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('SCHEDULED');
  });

  it('ATTENDANCE_CHECK with null minCapacity → CONFIRMED (null = auto-pass)', () => {
    const actor = actorAt('SCHEDULED', ctx({ minCapacity: null, acceptedCount: 0 }));
    actor.send({ type: 'ATTENDANCE_CHECK' });
    expect(actor.getSnapshot().value).toBe('CONFIRMED');
  });

  it('ATTENDANCE_CHECK with acceptedCount >= minCapacity → CONFIRMED', () => {
    const actor = actorAt('SCHEDULED', ctx({ minCapacity: 2, acceptedCount: 3 }));
    actor.send({ type: 'ATTENDANCE_CHECK' });
    expect(actor.getSnapshot().value).toBe('CONFIRMED');
  });

  it('ATTENDANCE_CHECK exactly at minCapacity → CONFIRMED', () => {
    const actor = actorAt('SCHEDULED', ctx({ minCapacity: 2, acceptedCount: 2 }));
    actor.send({ type: 'ATTENDANCE_CHECK' });
    expect(actor.getSnapshot().value).toBe('CONFIRMED');
  });

  it('ATTENDANCE_CHECK with acceptedCount < minCapacity → BELOW_CAPACITY', () => {
    const actor = actorAt('SCHEDULED', ctx({ minCapacity: 3, acceptedCount: 1 }));
    actor.send({ type: 'ATTENDANCE_CHECK' });
    expect(actor.getSnapshot().value).toBe('BELOW_CAPACITY');
  });

  it('CANCEL → CANCELLED', () => {
    const actor = actorAt('SCHEDULED', ctx());
    actor.send({ type: 'CANCEL' });
    expect(actor.getSnapshot().value).toBe('CANCELLED');
  });
});

// ---------------------------------------------------------------------------
// §2 — BELOW_CAPACITY
// ---------------------------------------------------------------------------

describe('BELOW_CAPACITY', () => {
  it('RESCHEDULE with no overlap → SCHEDULED', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx());
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('SCHEDULED');
  });

  it('RESCHEDULE with overlap → stays BELOW_CAPACITY', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx({ hasScheduleOverlap: true }));
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('BELOW_CAPACITY');
  });

  it('SUBMIT_SUGGESTION PROCEED_WITH_PARTIAL → stays BELOW_CAPACITY, records suggestion type', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx());
    actor.send({ type: 'SUBMIT_SUGGESTION', suggestionType: 'PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('BELOW_CAPACITY');
    expect(actor.getSnapshot().context.pendingSuggestionType).toBe('PROCEED_WITH_PARTIAL');
  });

  it('SUBMIT_SUGGESTION CLOSE_COURSE → stays BELOW_CAPACITY, records suggestion type', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx());
    actor.send({ type: 'SUBMIT_SUGGESTION', suggestionType: 'CLOSE_COURSE' });
    expect(actor.getSnapshot().value).toBe('BELOW_CAPACITY');
    expect(actor.getSnapshot().context.pendingSuggestionType).toBe('CLOSE_COURSE');
  });

  it('APPROVE_PROCEED_WITH_PARTIAL when PROCEED_WITH_PARTIAL suggestion pending → CONFIRMED', () => {
    const actor = actorAt(
      'BELOW_CAPACITY',
      ctx({ pendingSuggestionType: 'PROCEED_WITH_PARTIAL' }),
    );
    actor.send({ type: 'APPROVE_PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('CONFIRMED');
  });

  it('APPROVE_PROCEED_WITH_PARTIAL when no suggestion pending → stays BELOW_CAPACITY', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx({ pendingSuggestionType: null }));
    actor.send({ type: 'APPROVE_PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('BELOW_CAPACITY');
  });

  it('APPROVE_PROCEED_WITH_PARTIAL when CLOSE_COURSE suggestion pending → stays BELOW_CAPACITY', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx({ pendingSuggestionType: 'CLOSE_COURSE' }));
    actor.send({ type: 'APPROVE_PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('BELOW_CAPACITY');
  });

  it('CANCEL → CANCELLED', () => {
    const actor = actorAt('BELOW_CAPACITY', ctx());
    actor.send({ type: 'CANCEL' });
    expect(actor.getSnapshot().value).toBe('CANCELLED');
  });
});

// ---------------------------------------------------------------------------
// §2 — CONFIRMED
// ---------------------------------------------------------------------------

describe('CONFIRMED', () => {
  it('RESCHEDULE before lesson date → SCHEDULED', () => {
    const actor = actorAt('CONFIRMED', ctx({ lessonDateReached: false }));
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('SCHEDULED');
  });

  it('RESCHEDULE after lesson date → stays CONFIRMED (INV-09 lock)', () => {
    const actor = actorAt('CONFIRMED', ctx({ lessonDateReached: true }));
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('CONFIRMED');
  });

  it('RESCHEDULE with overlap → stays CONFIRMED', () => {
    const actor = actorAt('CONFIRMED', ctx({ hasScheduleOverlap: true }));
    actor.send({ type: 'RESCHEDULE' });
    expect(actor.getSnapshot().value).toBe('CONFIRMED');
  });

  it('LESSON_DATE_REACHED → LESSON_UNDERWAY', () => {
    const actor = actorAt('CONFIRMED', ctx());
    actor.send({ type: 'LESSON_DATE_REACHED' });
    expect(actor.getSnapshot().value).toBe('LESSON_UNDERWAY');
  });

  it('CANCEL → CANCELLED', () => {
    const actor = actorAt('CONFIRMED', ctx());
    actor.send({ type: 'CANCEL' });
    expect(actor.getSnapshot().value).toBe('CANCELLED');
  });
});

// ---------------------------------------------------------------------------
// §2 — LESSON_UNDERWAY
// ---------------------------------------------------------------------------

describe('LESSON_UNDERWAY', () => {
  it('ALL_ASSESSMENTS_SUBMITTED → LESSON_CONCLUDED', () => {
    const actor = actorAt('LESSON_UNDERWAY', ctx());
    actor.send({ type: 'ALL_ASSESSMENTS_SUBMITTED' });
    expect(actor.getSnapshot().value).toBe('LESSON_CONCLUDED');
  });
});
