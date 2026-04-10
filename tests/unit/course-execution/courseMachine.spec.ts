/**
 * Course lifecycle machine — pure unit tests.
 * Source: docs/course-state-machine.md §1
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  courseMachine,
  type CourseMachineContext,
} from '../../../src/course-execution/machines/courseMachine.js';

function ctx(overrides: Partial<CourseMachineContext> = {}): CourseMachineContext {
  return {
    assignedInstructorCount: 1,
    hasExactlyOneLead: true,
    hourlyRateSet: true,
    allInstructorsHaveWage: true,
    enrolledCount: 0,
    minCapacity: null,
    allStudentsResolved: true,
    hasPendingCloseSuggestion: false,
    ...overrides,
  };
}

function actorAt(stateValue: string, context: CourseMachineContext) {
  const snapshot = courseMachine.resolveState({ value: stateValue, context });
  const actor = createActor(courseMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §1 — OPEN
// ---------------------------------------------------------------------------

describe('OPEN', () => {
  it('START_COURSE with all hard guards passing, null capacity → STARTED', () => {
    const actor = actorAt('OPEN', ctx());
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('STARTED');
  });

  it('START_COURSE with enrolledCount >= minCapacity → STARTED', () => {
    const actor = actorAt('OPEN', ctx({ enrolledCount: 3, minCapacity: 2 }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('STARTED');
  });

  it('START_COURSE with enrolledCount exactly at minCapacity → STARTED', () => {
    const actor = actorAt('OPEN', ctx({ enrolledCount: 2, minCapacity: 2 }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('STARTED');
  });

  it('START_COURSE with zero instructors → stays OPEN (hard guard)', () => {
    const actor = actorAt('OPEN', ctx({ assignedInstructorCount: 0 }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('OPEN');
  });

  it('START_COURSE without exactly one lead → stays OPEN (hard guard)', () => {
    const actor = actorAt('OPEN', ctx({ hasExactlyOneLead: false }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('OPEN');
  });

  it('START_COURSE without hourly rate → stays OPEN (hard guard, INV-17)', () => {
    const actor = actorAt('OPEN', ctx({ hourlyRateSet: false }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('OPEN');
  });

  it('START_COURSE with missing instructor wage → stays OPEN (hard guard, INV-18)', () => {
    const actor = actorAt('OPEN', ctx({ allInstructorsHaveWage: false }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('OPEN');
  });

  it('START_COURSE below capacity, no override → stays OPEN (soft guard)', () => {
    const actor = actorAt('OPEN', ctx({ enrolledCount: 1, minCapacity: 3 }));
    actor.send({ type: 'START_COURSE' });
    expect(actor.getSnapshot().value).toBe('OPEN');
  });

  it('START_COURSE below capacity, overrideCapacity=true → STARTED (soft guard bypassed)', () => {
    const actor = actorAt('OPEN', ctx({ enrolledCount: 1, minCapacity: 3 }));
    actor.send({ type: 'START_COURSE', overrideCapacity: true });
    expect(actor.getSnapshot().value).toBe('STARTED');
  });

  it('CLOSE_COURSE direct → CLOSED', () => {
    const actor = actorAt('OPEN', ctx());
    actor.send({ type: 'CLOSE_COURSE' });
    expect(actor.getSnapshot().value).toBe('CLOSED');
  });
});

// ---------------------------------------------------------------------------
// §1 — STARTED
// ---------------------------------------------------------------------------

describe('STARTED', () => {
  it('ALL_STUDENTS_RESOLVED when allStudentsResolved=true → COMPLETED (INV-08)', () => {
    const actor = actorAt('STARTED', ctx({ allStudentsResolved: true }));
    actor.send({ type: 'ALL_STUDENTS_RESOLVED' });
    expect(actor.getSnapshot().value).toBe('COMPLETED');
  });

  it('ALL_STUDENTS_RESOLVED when allStudentsResolved=false → stays STARTED', () => {
    const actor = actorAt('STARTED', ctx({ allStudentsResolved: false }));
    actor.send({ type: 'ALL_STUDENTS_RESOLVED' });
    expect(actor.getSnapshot().value).toBe('STARTED');
  });

  it('APPROVE_CLOSE_SUGGESTION with pending CLOSE_COURSE suggestion → CLOSED', () => {
    const actor = actorAt('STARTED', ctx({ hasPendingCloseSuggestion: true }));
    actor.send({ type: 'APPROVE_CLOSE_SUGGESTION' });
    expect(actor.getSnapshot().value).toBe('CLOSED');
  });

  it('APPROVE_CLOSE_SUGGESTION without a pending suggestion → stays STARTED', () => {
    const actor = actorAt('STARTED', ctx({ hasPendingCloseSuggestion: false }));
    actor.send({ type: 'APPROVE_CLOSE_SUGGESTION' });
    expect(actor.getSnapshot().value).toBe('STARTED');
  });

  it('CLOSE_COURSE direct (no suggestion required) → CLOSED', () => {
    const actor = actorAt('STARTED', ctx());
    actor.send({ type: 'CLOSE_COURSE' });
    expect(actor.getSnapshot().value).toBe('CLOSED');
  });
});

// ---------------------------------------------------------------------------
// §1 — COMPLETED (terminal)
// ---------------------------------------------------------------------------

describe('COMPLETED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('COMPLETED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// §1 — CLOSED
// ---------------------------------------------------------------------------

describe('CLOSED', () => {
  it('REOPEN_COURSE → OPEN', () => {
    const actor = actorAt('CLOSED', ctx());
    actor.send({ type: 'REOPEN_COURSE' });
    expect(actor.getSnapshot().value).toBe('OPEN');
  });
});
