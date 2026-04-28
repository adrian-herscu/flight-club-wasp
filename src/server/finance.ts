import { Prisma, PaymentMethod } from '@prisma/client';
import { prisma } from 'wasp/server';

type FinanceDbClient = Prisma.TransactionClient | typeof prisma;

type LinkedTransactionOpts = {
  withdrawalAccountId: string;
  depositAccountId: string;
  amountMinor: number;
  currency: string;
  description: string;
  notes?: string;
  recordedByUserId?: string;
  paymentMethod?: PaymentMethod;
  externalReference?: string;
};

type DepositTransactionOpts = {
  accountId: string;
  amountMinor: number;
  currency: string;
  description: string;
  notes?: string;
  recordedByUserId?: string;
  paymentMethod?: PaymentMethod;
  externalReference?: string;
};

export async function getEffectiveAccountBalance(
  db: FinanceDbClient,
  accountId: string,
  startingBalanceMinor: number,
): Promise<number> {
  const [{ _sum: depositSum }, { _sum: withdrawalSum }] = await Promise.all([
    db.transaction.aggregate({ where: { accountId, type: 'DEPOSIT' }, _sum: { amountMinor: true } }),
    db.transaction.aggregate({ where: { accountId, type: 'WITHDRAWAL' }, _sum: { amountMinor: true } }),
  ]);

  return startingBalanceMinor + (depositSum.amountMinor ?? 0) - (withdrawalSum.amountMinor ?? 0);
}

export async function createLinkedTransactionPair(
  db: FinanceDbClient,
  opts: LinkedTransactionOpts,
): Promise<{ withdrawalTransactionId: string; depositTransactionId: string }> {
  const {
    withdrawalAccountId,
    depositAccountId,
    amountMinor,
    currency,
    description,
    notes,
    recordedByUserId,
    paymentMethod,
    externalReference,
  } = opts;

  const withdrawal = await db.transaction.create({
    data: {
      accountId: withdrawalAccountId,
      type: 'WITHDRAWAL',
      amountMinor,
      currency,
      description,
      notes,
      recordedByUserId,
      paymentMethod,
      externalReference,
    },
    select: { id: true },
  });

  const deposit = await db.transaction.create({
    data: {
      accountId: depositAccountId,
      type: 'DEPOSIT',
      amountMinor,
      currency,
      description,
      notes,
      recordedByUserId,
      paymentMethod,
      externalReference,
      linkedTransactionId: withdrawal.id,
    },
    select: { id: true },
  });

  return {
    withdrawalTransactionId: withdrawal.id,
    depositTransactionId: deposit.id,
  };
}

export async function createAccountDepositTransaction(
  db: FinanceDbClient,
  opts: DepositTransactionOpts,
): Promise<{ transactionId: string }> {
  const transaction = await db.transaction.create({
    data: {
      accountId: opts.accountId,
      type: 'DEPOSIT',
      amountMinor: opts.amountMinor,
      currency: opts.currency,
      description: opts.description,
      notes: opts.notes,
      recordedByUserId: opts.recordedByUserId,
      paymentMethod: opts.paymentMethod,
      externalReference: opts.externalReference,
    },
    select: { id: true },
  });

  return { transactionId: transaction.id };
}

export function getEnrollmentChargeAmount(enrollment: {
  listPriceMinor: number;
  agreedPriceMinor: number | null;
}): number {
  return enrollment.agreedPriceMinor ?? enrollment.listPriceMinor;
}