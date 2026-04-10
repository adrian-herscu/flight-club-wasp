/**
 * Refund request machine — pure unit tests.
 * Source: docs/course-state-machine.md §7
 */
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import {
  refundMachine,
  type RefundMachineContext,
} from '../../../src/course-execution/machines/refundMachine.js';

function ctx(overrides: Partial<RefundMachineContext> = {}): RefundMachineContext {
  return {
    hasPendingRefund: false,
    totalPaidMinor: 10000, // £100 in pence by default
    ...overrides,
  };
}

function actorAt(stateValue: string, context: RefundMachineContext) {
  const snapshot = refundMachine.resolveState({ value: stateValue, context });
  const actor = createActor(refundMachine, { snapshot });
  actor.start();
  return actor;
}

// ---------------------------------------------------------------------------
// §7 — NONE
// ---------------------------------------------------------------------------

describe('NONE', () => {
  it('SUBMIT_REFUND, no existing pending refund → PENDING', () => {
    const actor = actorAt('NONE', ctx({ hasPendingRefund: false }));
    actor.send({ type: 'SUBMIT_REFUND' });
    expect(actor.getSnapshot().value).toBe('PENDING');
  });

  it('SUBMIT_REFUND when a PENDING refund already exists → stays NONE (INV-13)', () => {
    const actor = actorAt('NONE', ctx({ hasPendingRefund: true }));
    actor.send({ type: 'SUBMIT_REFUND' });
    expect(actor.getSnapshot().value).toBe('NONE');
  });
});

// ---------------------------------------------------------------------------
// §7 — PENDING
// ---------------------------------------------------------------------------

describe('PENDING', () => {
  it('APPROVE with valid amount (0 < amount <= totalPaid) → APPROVED', () => {
    const actor = actorAt('PENDING', ctx({ totalPaidMinor: 10000 }));
    actor.send({ type: 'APPROVE', amountMinor: 5000 });
    expect(actor.getSnapshot().value).toBe('APPROVED');
  });

  it('APPROVE with full amount (= totalPaid) → APPROVED (full refund allowed)', () => {
    const actor = actorAt('PENDING', ctx({ totalPaidMinor: 10000 }));
    actor.send({ type: 'APPROVE', amountMinor: 10000 });
    expect(actor.getSnapshot().value).toBe('APPROVED');
  });

  it('APPROVE with amount exceeding totalPaid → stays PENDING (INV-12)', () => {
    const actor = actorAt('PENDING', ctx({ totalPaidMinor: 10000 }));
    actor.send({ type: 'APPROVE', amountMinor: 10001 });
    expect(actor.getSnapshot().value).toBe('PENDING');
  });

  it('APPROVE with amount = 0 → stays PENDING (must be positive)', () => {
    const actor = actorAt('PENDING', ctx({ totalPaidMinor: 10000 }));
    actor.send({ type: 'APPROVE', amountMinor: 0 });
    expect(actor.getSnapshot().value).toBe('PENDING');
  });

  it('APPROVE with negative amount → stays PENDING', () => {
    const actor = actorAt('PENDING', ctx({ totalPaidMinor: 10000 }));
    actor.send({ type: 'APPROVE', amountMinor: -1 });
    expect(actor.getSnapshot().value).toBe('PENDING');
  });

  it('DECLINE → DECLINED', () => {
    const actor = actorAt('PENDING', ctx());
    actor.send({ type: 'DECLINE' });
    expect(actor.getSnapshot().value).toBe('DECLINED');
  });
});

// ---------------------------------------------------------------------------
// §7 — Terminal states
// ---------------------------------------------------------------------------

describe('APPROVED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('APPROVED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});

describe('DECLINED', () => {
  it('is a terminal state (status = done)', () => {
    const actor = actorAt('DECLINED', ctx());
    expect(actor.getSnapshot().status).toBe('done');
  });
});
