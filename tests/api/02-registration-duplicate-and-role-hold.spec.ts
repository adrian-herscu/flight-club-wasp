import { describe, it, expect } from 'vitest';

import { prisma } from './wasp-server-stub.js';
import {
  submitRegistrationRequest,
} from '../../src/registration/operations.js';
import { SEED, createTestUser, createTestInstructor } from './testHelpers.js';

type HttpErrorShape = {
  statusCode: number;
  message: string;
};

const DUPLICATE_PENDING_MESSAGE = 'You already have a pending request for this role.';
const ALREADY_HOLD_ROLE_MESSAGE = 'You already hold this role for the selected school.';

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
  it('[STD-REG-002][STD-REG-011][STD-REG-013] school manager duplicate request is blocked', async () => {
    const user = await createTestUser();
    const schoolName = `API Duplicate School ${Date.now()}`;
    const args = {
      fullName: 'API User',
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

    await submitRegistrationRequest(args, user.ctx);

    await expectHttpError(
      submitRegistrationRequest(args, user.ctx),
      409,
      DUPLICATE_PENDING_MESSAGE,
    );
  });

  it('[STD-REG-009][STD-REG-011][STD-REG-013] instructor duplicate request is blocked', async () => {
    const user = await createTestUser();
    const args = {
      fullName: 'API User',
      phone: '+1 555 2002',
      requestedRole: 'INSTRUCTOR' as const,
      targetSchoolId: SEED.schools.cloudbase,
    };

    await submitRegistrationRequest(args, user.ctx);

    await expectHttpError(
      submitRegistrationRequest(args, user.ctx),
      409,
      DUPLICATE_PENDING_MESSAGE,
    );
  });

  it('[STD-REG-005][STD-REG-010] student registration via form is rejected — students join via course-interest flow', async () => {
    const user = await createTestUser();
    const args = {
      fullName: 'API User',
      phone: '+1 555 2003',
      requestedRole: 'STUDENT' as const,
      targetSchoolId: SEED.schools.cloudbase,
    };

    await expectHttpError(
      submitRegistrationRequest(args, user.ctx),
      400,
      'Student membership is granted through the course-interest flow, not direct registration.',
    );
  });

  it('[STD-REG-012] approved role cannot be re-requested for the same school', async () => {
    // createTestInstructor provisions the user + INSTRUCTOR role at cloudbase
    const instructor = await createTestInstructor(SEED.schools.cloudbase, 'USD');
    const args = {
      fullName: 'API Instructor',
      phone: '+1 555 2004',
      requestedRole: 'INSTRUCTOR' as const,
      targetSchoolId: SEED.schools.cloudbase,
    };

    await expectHttpError(
      submitRegistrationRequest(args, instructor.ctx),
      409,
      ALREADY_HOLD_ROLE_MESSAGE,
    );
  });

  it('[STD-INT-004] concurrent duplicate submissions produce exactly one pending request', async () => {
    const user = await createTestUser();
    const schoolName = `API Race School ${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const args = {
      fullName: 'API User',
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
      submitRegistrationRequest(args, user.ctx),
      submitRegistrationRequest(args, user.ctx),
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
        requesterId: user.id,
        requestedRole: 'SCHOOL_MANAGER',
        requestedSchoolName: schoolName,
        status: 'PENDING',
      },
    });

    expect(pendingCount).toBe(1);
  });
});
