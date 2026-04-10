/**
 * Student enrollment status machine — pure unit tests.
 * Source: docs/course-state-machine.md §6
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  enrollmentMachine,
  type EnrollmentMachineContext,
} from '../../../src/course-execution/machines/enrollmentMachine.js';

function ctx(overrides: Partial<EnrollmentMachineContext> = {}): EnrollmentMachineContext {
  return { isFinalLesson: false, ...overrides };
}

function actorAt(stateValue: string, context: EnrollmentMachineContext) {
  const snapshot = enrollmentMachine.resolveState({ value: stateValue, context });
  const actor = createActor(enrollmentMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §6 — ACTIVE
// ---------------------------------------------------------------------------

describe('ACTIVE', () => {
  it('PASS on final lesson → CERTIFIED', () => {
    const actor = actorAt('ACTIVE', ctx({ isFinalLesson: true }));
    actor.send({ type: 'ASSESSMENT_SUBMITTED', result: 'PASS', attended: true });
    expect(actor.getSnapshot().value).toBe('CERTIFIED');
  });

  it('PASS on non-final lesson → stays ACTIVE (progress recorded)', () => {
    const actor = actorAt('ACTIVE', ctx({ isFinalLesson: false }));
    actor.send({ type: 'ASSESSMENT_SUBMITTED', result: 'PASS', attended: true });
    expect(actor.getSnapshot().value).toBe('ACTIVE');
  });

  it('FAIL → FAILED', () => {
    const actor = actorAt('ACTIVE', ctx());
    actor.send({ type: 'ASSESSMENT_SUBMITTED', result: 'FAIL', attended: true });
    expect(actor.getSnapshot().value).toBe('FAILED');
  });

  it('absent (attended=false) → FAILED (INV-15: absent always implies fail)', () => {
    const actor = actorAt('ACTIVE', ctx());
    actor.send({ type: 'ASSESSMENT_SUBMITTED', result: 'FAIL', attended: false });
    expect(actor.getSnapshot().value).toBe('FAILED');
  });

  it('attended=false with result=PASS → FAILED (INV-15: machine enforces constraint)', () => {
    const actor = actorAt('ACTIVE', ctx({ isFinalLesson: true }));
    // API should reject this before sending, but machine also handles it correctly.
    actor.send({ type: 'ASSESSMENT_SUBMITTED', result: 'PASS', attended: false });
    expect(actor.getSnapshot().value).toBe('FAILED');
  });
});

// ---------------------------------------------------------------------------
// §6 — Terminal states
// ---------------------------------------------------------------------------

describe('CERTIFIED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('CERTIFIED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});

describe('FAILED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('FAILED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});
