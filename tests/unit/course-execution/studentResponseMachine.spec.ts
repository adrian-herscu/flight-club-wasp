/**
 * Student lesson response machine — pure unit tests.
 * Source: docs/course-state-machine.md §3
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  studentResponseMachine,
  type StudentResponseContext,
} from '../../../src/course-execution/machines/studentResponseMachine.js';

function ctx(overrides: Partial<StudentResponseContext> = {}): StudentResponseContext {
  return { lessonDateReached: false, ...overrides };
}

function actorAt(stateValue: string, context: StudentResponseContext) {
  const snapshot = studentResponseMachine.resolveState({ value: stateValue, context });
  const actor = createActor(studentResponseMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §3 — NO_RESPONSE
// ---------------------------------------------------------------------------

describe('NO_RESPONSE', () => {
  it('ACCEPT, date not reached → ACCEPTED', () => {
    const actor = actorAt('NO_RESPONSE', ctx());
    actor.send({ type: 'ACCEPT' });
    expect(actor.getSnapshot().value).toBe('ACCEPTED');
  });

  it('DECLINE, date not reached → DECLINED', () => {
    const actor = actorAt('NO_RESPONSE', ctx());
    actor.send({ type: 'DECLINE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('ACCEPT after date reached → stays NO_RESPONSE (locked, INV-09)', () => {
    const actor = actorAt('NO_RESPONSE', ctx({ lessonDateReached: true }));
    actor.send({ type: 'ACCEPT' });
    expect(actor.getSnapshot().value).toBe('NO_RESPONSE');
  });

  it('DECLINE after date reached → stays NO_RESPONSE (locked, INV-09)', () => {
    const actor = actorAt('NO_RESPONSE', ctx({ lessonDateReached: true }));
    actor.send({ type: 'DECLINE' });
    expect(actor.getSnapshot().value).toBe('NO_RESPONSE');
  });
});

// ---------------------------------------------------------------------------
// §3 — ACCEPTED
// ---------------------------------------------------------------------------

describe('ACCEPTED', () => {
  it('DECLINE, date not reached → DECLINED (post-confirmation withdrawal)', () => {
    const actor = actorAt('ACCEPTED', ctx());
    actor.send({ type: 'DECLINE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('ACCEPT, date not reached → stays ACCEPTED (re-accept no-op)', () => {
    const actor = actorAt('ACCEPTED', ctx());
    actor.send({ type: 'ACCEPT' });
    expect(actor.getSnapshot().value).toBe('ACCEPTED');
  });

  it('DECLINE after date reached → stays ACCEPTED (locked, INV-09)', () => {
    const actor = actorAt('ACCEPTED', ctx({ lessonDateReached: true }));
    actor.send({ type: 'DECLINE' });
    expect(actor.getSnapshot().value).toBe('ACCEPTED');
  });

  it('RESET (system reschedule) → NO_RESPONSE', () => {
    const actor = actorAt('ACCEPTED', ctx());
    actor.send({ type: 'RESET' });
    expect(actor.getSnapshot().value).toBe('NO_RESPONSE');
  });
});

// ---------------------------------------------------------------------------
// §3 — DECLINED
// ---------------------------------------------------------------------------

describe('DECLINED', () => {
  it('ACCEPT, date not reached → ACCEPTED (re-accept after withdrawal)', () => {
    const actor = actorAt('DECLINED', ctx());
    actor.send({ type: 'ACCEPT' });
    expect(actor.getSnapshot().value).toBe('ACCEPTED');
  });

  it('DECLINE, date not reached → stays DECLINED (re-decline no-op)', () => {
    const actor = actorAt('DECLINED', ctx());
    actor.send({ type: 'DECLINE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('ACCEPT after date reached → stays DECLINED (locked, INV-09)', () => {
    const actor = actorAt('DECLINED', ctx({ lessonDateReached: true }));
    actor.send({ type: 'ACCEPT' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('RESET (system reschedule) → NO_RESPONSE', () => {
    const actor = actorAt('DECLINED', ctx());
    actor.send({ type: 'RESET' });
    expect(actor.getSnapshot().value).toBe('NO_RESPONSE');
  });
});
