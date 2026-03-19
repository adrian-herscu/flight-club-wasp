import { describe, it, expect, beforeEach } from 'vitest';

import { prisma } from '../src/wasp-server-stub';
import {
  submitRegistrationRequest,
} from '../../app/src/registration/operations';
import { SEED, ctx } from '../src/testHelpers';

type HttpErrorShape = {
  statusCode: number;
  message: string;
};

const DUPLICATE_PENDING_MESSAGE = 'You already have a pending request for this role.';
const ALREADY_HOLD_ROLE_MESSAGE = 'You already hold this role for the selected school.';

async function clearRequesterRequests(requesterId: string): Promise<void> {
  await prisma.registrationRequestDecision.deleteMany({
    where: {
      request: {
        requesterId,
      },
    },
  });

  await prisma.registrationRequest.deleteMany({
    where: { requesterId },
  });
}

async function expectHttpError(
  promise: Promise<unknown>,
  expectedStatusCode: number,
  expectedMessage: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    statusCode: expectedStatusCode,
    message: expectedMessage,
  } satisfies HttpErrorShape);
}

describe('4.3 registration request guardrails (API)', () => {
  beforeEach(async () => {
    await clearRequesterRequests(SEED.users.user01);
    await clearRequesterRequests(SEED.users.instructor01);
    await clearRequesterRequests(SEED.users.user02);

    // Reset mutable role grants created by other suites/E2E runs so
    // duplicate-pending tests start from a clean role baseline.
    await prisma.userSchoolRole.deleteMany({
      where: {
        userId: SEED.users.user01,
        schoolId: SEED.schools.cloudbase,
        role: 'INSTRUCTOR',
      },
    });

    await prisma.userSchoolRole.deleteMany({
      where: {
        userId: SEED.users.instructor01,
        schoolId: SEED.schools.cloudbase,
        role: 'STUDENT',
      },
    });
  });

  it('[STD-REG-011][STD-REG-013] school manager duplicate request is blocked', async () => {
    const schoolName = `API Duplicate School ${Date.now()}`;
    const args = {
      fullName: 'API User 01',
      phone: '+1 555 2001',
      requestedRole: 'SCHOOL_MANAGER' as const,
      requestedSchoolName: schoolName,
      requestedWebsiteUrl: 'https://api-dup-school.example.test',
      requestedAddressLine1: '10 Ridge Road',
      requestedCity: 'Annecy',
      requestedPostalCode: '74000',
      requestedCountry: 'FR',
      requestedCurrency: 'EUR',
    };

    await submitRegistrationRequest(args, ctx.user01);

    await expectHttpError(
      submitRegistrationRequest(args, ctx.user01),
      409,
      DUPLICATE_PENDING_MESSAGE,
    );
  });

  it('[STD-REG-011][STD-REG-013] instructor duplicate request is blocked', async () => {
    const args = {
      fullName: 'API User 01',
      phone: '+1 555 2002',
      requestedRole: 'INSTRUCTOR' as const,
      targetSchoolId: SEED.schools.cloudbase,
    };

    await submitRegistrationRequest(args, ctx.user01);

    await expectHttpError(
      submitRegistrationRequest(args, ctx.user01),
      409,
      DUPLICATE_PENDING_MESSAGE,
    );
  });

  it('[STD-REG-011][STD-REG-013] student duplicate request is blocked', async () => {
    const args = {
      fullName: 'API Instructor 01',
      phone: '+1 555 2003',
      requestedRole: 'STUDENT' as const,
      targetSchoolId: SEED.schools.cloudbase,
    };

    await submitRegistrationRequest(args, ctx.instructor);

    await expectHttpError(
      submitRegistrationRequest(args, ctx.instructor),
      409,
      DUPLICATE_PENDING_MESSAGE,
    );
  });

  it('[STD-REG-012] approved role cannot be re-requested for the same school', async () => {
    // instructor01 already holds the INSTRUCTOR role at cloudbase via seed
    const args = {
      fullName: 'API Instructor 01',
      phone: '+1 555 2004',
      requestedRole: 'INSTRUCTOR' as const,
      targetSchoolId: SEED.schools.cloudbase,
    };

    await expectHttpError(
      submitRegistrationRequest(args, ctx.instructor),
      409,
      ALREADY_HOLD_ROLE_MESSAGE,
    );
  });

  it('[STD-INT-004] concurrent duplicate submissions produce exactly one pending request', async () => {
    const schoolName = `API Race School ${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const args = {
      fullName: 'API User 01',
      phone: '+1 555 2005',
      requestedRole: 'SCHOOL_MANAGER' as const,
      requestedSchoolName: schoolName,
      requestedWebsiteUrl: 'https://api-race-school.example.test',
      requestedAddressLine1: '99 Alpine Street',
      requestedCity: 'Grenoble',
      requestedPostalCode: '38000',
      requestedCountry: 'FR',
      requestedCurrency: 'EUR',
    };

    const [left, right] = await Promise.allSettled([
      submitRegistrationRequest(args, ctx.user01),
      submitRegistrationRequest(args, ctx.user01),
    ]);

    const fulfilled = [left, right].filter((r) => r.status === 'fulfilled');
    const rejected = [left, right].filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason as HttpErrorShape;
    expect(reason.statusCode).toBe(409);
    expect(reason.message).toBe(DUPLICATE_PENDING_MESSAGE);

    const pendingCount = await prisma.registrationRequest.count({
      where: {
        requesterId: SEED.users.user01,
        requestedRole: 'SCHOOL_MANAGER',
        requestedSchoolName: schoolName,
        status: 'PENDING',
      },
    });

    expect(pendingCount).toBe(1);
  });
});
