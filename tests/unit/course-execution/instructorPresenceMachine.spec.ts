/**
 * Instructor lesson presence machine — pure unit tests.
 * Source: docs/course-state-machine.md §5
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  instructorPresenceMachine,
  type InstructorPresenceContext,
} from '../../../src/course-execution/machines/instructorPresenceMachine.js';

function ctx(overrides: Partial<InstructorPresenceContext> = {}): InstructorPresenceContext {
  return { lessonDateReached: false, ...overrides };
}

function actorAt(stateValue: string, context: InstructorPresenceContext) {
  const snapshot = instructorPresenceMachine.resolveState({ value: stateValue, context });
  const actor = createActor(instructorPresenceMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §5 — EXPECTED
// ---------------------------------------------------------------------------

describe('EXPECTED', () => {
  it('REPORT_UNAVAILABLE, date not reached → DECLINED', () => {
    const actor = actorAt('EXPECTED', ctx());
    actor.send({ type: 'REPORT_UNAVAILABLE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('REPORT_UNAVAILABLE after date reached → stays EXPECTED (locked, INV-09)', () => {
    const actor = actorAt('EXPECTED', ctx({ lessonDateReached: true }));
    actor.send({ type: 'REPORT_UNAVAILABLE' });
    expect(actor.getSnapshot().value).toBe('EXPECTED');
  });

  it('CONFIRM_AVAILABLE, date not reached → stays EXPECTED (no-op self-transition)', () => {
    const actor = actorAt('EXPECTED', ctx());
    actor.send({ type: 'CONFIRM_AVAILABLE' });
    expect(actor.getSnapshot().value).toBe('EXPECTED');
  });
});

// ---------------------------------------------------------------------------
// §5 — DECLINED
// ---------------------------------------------------------------------------

describe('DECLINED', () => {
  it('CONFIRM_AVAILABLE, date not reached → EXPECTED (re-confirm)', () => {
    const actor = actorAt('DECLINED', ctx());
    actor.send({ type: 'CONFIRM_AVAILABLE' });
    expect(actor.getSnapshot().value).toBe('EXPECTED');
  });

  it('CONFIRM_AVAILABLE after date reached → stays DECLINED (locked, INV-09)', () => {
    const actor = actorAt('DECLINED', ctx({ lessonDateReached: true }));
    actor.send({ type: 'CONFIRM_AVAILABLE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('REPORT_UNAVAILABLE, date not reached → stays DECLINED (no-op self-transition)', () => {
    const actor = actorAt('DECLINED', ctx());
    actor.send({ type: 'REPORT_UNAVAILABLE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('MARK_ABSENT, date not reached → ABSENT (lead instructor decision, INV-20)', () => {
    const actor = actorAt('DECLINED', ctx());
    actor.send({ type: 'MARK_ABSENT' });
    expect(actor.getSnapshot().value).toBe('ABSENT');
  });

  it('MARK_ABSENT after date reached → stays DECLINED (locked)', () => {
    const actor = actorAt('DECLINED', ctx({ lessonDateReached: true }));
    actor.send({ type: 'MARK_ABSENT' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });
});

// ---------------------------------------------------------------------------
// §5 — ABSENT
// ---------------------------------------------------------------------------

describe('ABSENT', () => {
  it('REPORT_UNAVAILABLE, date not reached → DECLINED (advisory hint, "any → DECLINED")', () => {
    const actor = actorAt('ABSENT', ctx());
    actor.send({ type: 'REPORT_UNAVAILABLE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });

  it('CONFIRM_AVAILABLE, date not reached → EXPECTED (advisory hint, "any → EXPECTED")', () => {
    const actor = actorAt('ABSENT', ctx());
    actor.send({ type: 'CONFIRM_AVAILABLE' });
    expect(actor.getSnapshot().value).toBe('EXPECTED');
  });

  it('REPORT_UNAVAILABLE after date reached → stays ABSENT (locked)', () => {
    const actor = actorAt('ABSENT', ctx({ lessonDateReached: true }));
    actor.send({ type: 'REPORT_UNAVAILABLE' });
    expect(actor.getSnapshot().value).toBe('ABSENT');
  });
});

// ---------------------------------------------------------------------------
// §5 — MARK_ABSENT not available from EXPECTED (only from DECLINED per spec)
// ---------------------------------------------------------------------------

describe('MARK_ABSENT guard — only available from DECLINED', () => {
  it('MARK_ABSENT from EXPECTED → stays EXPECTED (not available per spec)', () => {
    const actor = actorAt('EXPECTED', ctx());
    actor.send({ type: 'MARK_ABSENT' });
    expect(actor.getSnapshot().value).toBe('EXPECTED');
  });

  it('MARK_ABSENT from ABSENT → stays ABSENT (not available per spec)', () => {
    const actor = actorAt('ABSENT', ctx());
    actor.send({ type: 'MARK_ABSENT' });
    expect(actor.getSnapshot().value).toBe('ABSENT');
  });
});
