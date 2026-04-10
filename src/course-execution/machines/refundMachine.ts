/**
 * Refund Request Lifecycle — XState v5 machine
 *
 * Source of truth: docs/course-state-machine.md §7
 *
 * One RefundRequest row per request.
 * INV-13: at most one PENDING refund per student per course at a time.
 * INV-12: approved amount may not exceed total amount paid by the student.
 */
import { setup } from 'xstate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RefundRequestStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';

export interface RefundMachineContext {
  /**
   * True when a PENDING RefundRequest already exists for this student+course.
   * Guards against INV-13 (at most one pending refund at a time).
   */
  hasPendingRefund: boolean;
  /**
   * Total amount debited from the student for this course enrollment in minor
   * currency units. Ceiling for any approved refund amount (INV-12).
   */
  totalPaidMinor: number;
}

export type RefundEvent =
  | { type: 'SUBMIT_REFUND' }
  | { type: 'APPROVE'; amountMinor: number }
  | { type: 'DECLINE' };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const refundMachine = setup({
  types: {
    context: {} as RefundMachineContext,
    events: {} as RefundEvent,
    input: {} as RefundMachineContext,
  },

  guards: {
    /** INV-13: no other PENDING refund exists for this student+course. */
    noPendingRefund: ({ context }) => !context.hasPendingRefund,

    /**
     * INV-12: amount must be positive and must not exceed what the student paid.
     */
    refundAmountValid: ({ context, event }) =>
      event.type === 'APPROVE' &&
      event.amountMinor > 0 &&
      event.amountMinor <= context.totalPaidMinor,
  },

  actions: {
    createRefundRecord: () => {},
    notifyManager: () => {},
    processRefundTransaction: () => {},
    notifyStudent: () => {},
  },
}).createMachine({
  id: 'refund',
  context: ({ input }) => ({ ...input }),
  initial: 'NONE',

  states: {
    /** No refund request has been submitted for this enrollment. */
    NONE: {
      on: {
        SUBMIT_REFUND: {
          guard: 'noPendingRefund',
          target: 'PENDING',
          actions: ['createRefundRecord', 'notifyManager'],
        },
      },
    },

    /** Refund request submitted and awaiting manager review. */
    PENDING: {
      on: {
        APPROVE: {
          guard: 'refundAmountValid',
          target: 'APPROVED',
          actions: ['processRefundTransaction', 'notifyStudent'],
        },
        DECLINE: {
          target: 'DECLINED',
          actions: ['notifyStudent'],
        },
      },
    },

    /** Manager approved and financial transaction executed. Terminal. */
    APPROVED: { type: 'final' },

    /** Manager declined the refund request. Terminal. */
    DECLINED: { type: 'final' },
  },
});
