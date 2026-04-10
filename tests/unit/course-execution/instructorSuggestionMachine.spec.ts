/**
 * Instructor suggestion machine — pure unit tests.
 * Source: docs/course-state-machine.md §4
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  instructorSuggestionMachine,
  type InstructorSuggestionContext,
} from '../../../src/course-execution/machines/instructorSuggestionMachine.js';

function ctx(
  overrides: Partial<InstructorSuggestionContext> = {},
): InstructorSuggestionContext {
  return {
    lessonStatus: 'BELOW_CAPACITY',
    courseStatus: 'STARTED',
    hasAcceptedStudent: true,
    ...overrides,
  };
}

function actorAt(stateValue: string, context: InstructorSuggestionContext) {
  const snapshot = instructorSuggestionMachine.resolveState({ value: stateValue, context });
  const actor = createActor(instructorSuggestionMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §4 — NONE
// ---------------------------------------------------------------------------

describe('NONE', () => {
  it('SUBMIT_PROCEED_WITH_PARTIAL, lesson BELOW_CAPACITY, has accepted student → PROCEED_WITH_PARTIAL', () => {
    const actor = actorAt('NONE', ctx());
    actor.send({ type: 'SUBMIT_PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('PROCEED_WITH_PARTIAL');
  });

  it('SUBMIT_PROCEED_WITH_PARTIAL when lesson not BELOW_CAPACITY → stays NONE', () => {
    const actor = actorAt('NONE', ctx({ lessonStatus: 'SCHEDULED' }));
    actor.send({ type: 'SUBMIT_PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('NONE');
  });

  it('SUBMIT_PROCEED_WITH_PARTIAL with no accepted students → stays NONE', () => {
    const actor = actorAt('NONE', ctx({ hasAcceptedStudent: false }));
    actor.send({ type: 'SUBMIT_PROCEED_WITH_PARTIAL' });
    expect(actor.getSnapshot().value).toBe('NONE');
  });

  it('SUBMIT_CLOSE_COURSE, lesson BELOW_CAPACITY → CLOSE_COURSE', () => {
    const actor = actorAt('NONE', ctx());
    actor.send({ type: 'SUBMIT_CLOSE_COURSE' });
    expect(actor.getSnapshot().value).toBe('CLOSE_COURSE');
  });

  it('SUBMIT_CLOSE_COURSE when lesson not BELOW_CAPACITY → stays NONE', () => {
    const actor = actorAt('NONE', ctx({ lessonStatus: 'CONFIRMED' }));
    actor.send({ type: 'SUBMIT_CLOSE_COURSE' });
    expect(actor.getSnapshot().value).toBe('NONE');
  });
});

// ---------------------------------------------------------------------------
// §4 — PROCEED_WITH_PARTIAL
// ---------------------------------------------------------------------------

describe('PROCEED_WITH_PARTIAL', () => {
  it('APPROVE, course is STARTED → APPROVED', () => {
    const actor = actorAt('PROCEED_WITH_PARTIAL', ctx({ courseStatus: 'STARTED' }));
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('APPROVED');
  });

  it('APPROVE when course not STARTED → stays PROCEED_WITH_PARTIAL', () => {
    const actor = actorAt('PROCEED_WITH_PARTIAL', ctx({ courseStatus: 'CLOSED' }));
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('PROCEED_WITH_PARTIAL');
  });

  it('SUPERSEDE (instructor reschedules) → SUPERSEDED', () => {
    const actor = actorAt('PROCEED_WITH_PARTIAL', ctx());
    actor.send({ type: 'SUPERSEDE' });
    expect(actor.getSnapshot().value).toBe('SUPERSEDED');
  });
});

// ---------------------------------------------------------------------------
// §4 — CLOSE_COURSE
// ---------------------------------------------------------------------------

describe('CLOSE_COURSE', () => {
  it('APPROVE, course is STARTED → APPROVED', () => {
    const actor = actorAt('CLOSE_COURSE', ctx({ courseStatus: 'STARTED' }));
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('APPROVED');
  });

  it('APPROVE when course not STARTED → stays CLOSE_COURSE', () => {
    const actor = actorAt('CLOSE_COURSE', ctx({ courseStatus: 'CLOSED' }));
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('CLOSE_COURSE');
  });

  it('SUPERSEDE (instructor reschedules) → SUPERSEDED', () => {
    const actor = actorAt('CLOSE_COURSE', ctx());
    actor.send({ type: 'SUPERSEDE' });
    expect(actor.getSnapshot().value).toBe('SUPERSEDED');
  });
});

// ---------------------------------------------------------------------------
// §4 — Terminal states
// ---------------------------------------------------------------------------

describe('APPROVED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('APPROVED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});

describe('SUPERSEDED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('SUPERSEDED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});
