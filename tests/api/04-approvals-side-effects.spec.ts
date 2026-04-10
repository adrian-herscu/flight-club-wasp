import { beforeEach, describe, expect, it } from 'vitest';

import {
  approveSchoolManagerRequest,
  approveSchoolMemberRequest,
  submitRegistrationRequest,
} from '../../src/registration/operations.js';
import { ctx, SEED } from './testHelpers.js';
import { prisma } from './wasp-server-stub.js';

const SECONDARY_MANAGER_SCHOOL_ID = 'seed-school-cloudbase-annex';

const TEMP = {
  users: {
    managerReqA: {
      id: 'api-temp-approve-manager-a',
      email: 'api.temp.approve.manager.a@example.test',
    },
    managerReqB: {
      id: 'api-temp-approve-manager-b',
      email: 'api.temp.approve.manager.b@example.test',
    },
    memberReqInstructor: {
      id: 'api-temp-approve-member-instructor',
      email: 'api.temp.approve.member.instructor@example.test',
    },
  },
} as const;

const tempCtx = {
  managerReqA: { user: { id: TEMP.users.managerReqA.id, isSystemAdmin: false as const } },
  managerReqB: { user: { id: TEMP.users.managerReqB.id, isSystemAdmin: false as const } },
  memberReqInstructor: {
    user: { id: TEMP.users.memberReqInstructor.id, isSystemAdmin: false as const },
  },
};

type HttpErrorShape = {
  statusCode: number;
  message: string;
};

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

function uniqueSuffix(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function safeCleanupForThisSpec(): Promise<void> {
  const tempUserIds = [
    TEMP.users.managerReqA.id,
    TEMP.users.managerReqB.id,
    TEMP.users.memberReqInstructor.id,
  ];

  for (const tempUser of Object.values(TEMP.users)) {
    await prisma.user.upsert({
      where: { id: tempUser.id },
      update: {
        email: tempUser.email,
      },
      create: {
        id: tempUser.id,
        email: tempUser.email,
      },
    });
  }

  await prisma.registrationRequestDecision.deleteMany({
    where: {
      request: {
        requesterId: { in: tempUserIds },
      },
    },
  });

  await prisma.registrationRequest.deleteMany({
    where: {
      requesterId: { in: tempUserIds },
    },
  });

  await prisma.userSchoolRole.deleteMany({
    where: {
      userId: { in: tempUserIds },
      NOT: {
        AND: [
          { userId: SEED.users.schoolManager01 },
          { schoolId: SEED.schools.cloudbase },
          { role: 'SCHOOL_MANAGER' },
        ],
      },
    },
  });

}

async function createSchoolManagerRequest(
  requesterContext: { user: { id: string } | null },
  schoolNamePrefix: string,
): Promise<{ requestId: string; schoolName: string }> {
  const schoolName = uniqueSuffix(schoolNamePrefix);

  await submitRegistrationRequest(
    {
      fullName: 'API School Manager Candidate',
      phone: '+1 555 4001',
      requestedRole: 'SCHOOL_MANAGER',
      requestedSchoolName: schoolName,
      requestedWebsiteUrl: 'https://api-approve-school.example.test',
      requestedAddressLine1: '100 Mountain Road',
      requestedCity: 'Geneva',
      requestedPostalCode: '1200',
      requestedCountry: 'CH',
      requestedCurrency: 'CHF',
    },
    requesterContext as any,
  );

  const request = await prisma.registrationRequest.findFirst({
    where: {
      requesterId: requesterContext.user!.id,
      requestedRole: 'SCHOOL_MANAGER',
      requestedSchoolName: schoolName,
      status: 'PENDING',
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  expect(request?.id).toBeDefined();
  return { requestId: request!.id, schoolName };
}

async function createMemberRequest(
  requesterContext: { user: { id: string } | null },
  role: 'INSTRUCTOR' | 'STUDENT',
  schoolId: string,
): Promise<string> {
  await prisma.registrationRequest.deleteMany({
    where: {
      requesterId: requesterContext.user!.id,
      requestedRole: role,
      targetSchoolId: schoolId,
      status: 'PENDING',
    },
  });

  await submitRegistrationRequest(
    {
      fullName: `API ${role} Candidate`,
      phone: '+1 555 4002',
      requestedRole: role,
      targetSchoolId: schoolId,
    },
    requesterContext as any,
  );

  const request = await prisma.registrationRequest.findFirst({
    where: {
      requesterId: requesterContext.user!.id,
      requestedRole: role,
      targetSchoolId: schoolId,
      status: 'PENDING',
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  expect(request?.id).toBeDefined();
  return request!.id;
}

async function createIncompleteSchoolManagerRequest(
  requesterContext: { user: { id: string } | null },
): Promise<string> {
  const request = await prisma.registrationRequest.create({
    data: {
      requesterId: requesterContext.user!.id,
      requestedRole: 'SCHOOL_MANAGER',
      status: 'PENDING',
      requestedSchoolName: uniqueSuffix('api-incomplete-school'),
      // intentionally missing address/city/postal/country/currency
    },
    select: { id: true },
  });

  return request.id;
}

async function createSchoolOutsideManagerScope(): Promise<string> {
  const id = uniqueSuffix('api-approve-other-school');
  await prisma.school.create({
    data: {
      id,
      name: `Other Scope ${Date.now()}`,
      addressLine1: '2 Remote Road',
      city: 'Lyon',
      postalCode: '69000',
      country: 'FR',
      currency: 'EUR',
      adminId: SEED.users.systemAdmin01,
    },
  });
  return id;
}

describe('4.4 / 4.5 approval side effects and guardrails (API)', () => {
  beforeEach(async () => {
    await safeCleanupForThisSpec();
  });

  describe('approveSchoolManagerRequest', () => {
    it('[STD-ADM-003] approves pending request and provisions school/account/role/decision', async () => {
      const { requestId, schoolName } = await createSchoolManagerRequest(
        tempCtx.managerReqA,
        'api-approve-school-manager',
      );

      const result = (await approveSchoolManagerRequest(
        { requestId },
        ctx.systemAdmin,
      )) as {
        requestId: string;
        approvedSchoolId: string;
      };

      expect(result.requestId).toBe(requestId);
      expect(result.approvedSchoolId).toBeTruthy();

      const school = await prisma.school.findUnique({
        where: { id: result.approvedSchoolId },
        select: {
          id: true,
          name: true,
          adminId: true,
          country: true,
          currency: true,
        },
      });

      expect(school?.name).toBe(schoolName);
      expect(school?.adminId).toBe(TEMP.users.managerReqA.id);
      expect(school?.country).toBe('CH');
      expect(school?.currency).toBe('CHF');

      const account = await prisma.account.findFirst({
        where: {
          userId: TEMP.users.managerReqA.id,
          schoolId: result.approvedSchoolId,
        },
        select: { id: true, currency: true },
      });
      expect(account?.id).toBeTruthy();
      expect(account?.currency).toBe('CHF');

      const role = await prisma.userSchoolRole.findUnique({
        where: {
          userId_schoolId_role: {
            userId: TEMP.users.managerReqA.id,
            schoolId: result.approvedSchoolId,
            role: 'SCHOOL_MANAGER',
          },
        },
        select: {
          role: true,
          grantedByUserId: true,
          sourceRegistrationRequestId: true,
        },
      });

      expect(role?.role).toBe('SCHOOL_MANAGER');
      expect(role?.grantedByUserId).toBe(SEED.users.systemAdmin01);
      expect(role?.sourceRegistrationRequestId).toBe(requestId);

      const decision = await prisma.registrationRequestDecision.findFirst({
        where: { requestId, decisionType: 'APPROVED' },
        select: { reviewerId: true, approvedSchoolId: true },
      });
      expect(decision?.reviewerId).toBe(SEED.users.systemAdmin01);
      expect(decision?.approvedSchoolId).toBe(result.approvedSchoolId);

      const request = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, reviewerId: true, approvedSchoolId: true },
      });
      expect(request?.status).toBe('APPROVED');
      expect(request?.reviewerId).toBe(SEED.users.systemAdmin01);
      expect(request?.approvedSchoolId).toBe(result.approvedSchoolId);
    });

    it('returns 400 when school details are incomplete', async () => {
      const requestId = await createIncompleteSchoolManagerRequest(tempCtx.managerReqA);

      await expectHttpError(
        approveSchoolManagerRequest({ requestId }, ctx.systemAdmin),
        400,
        'School details are incomplete for this request.',
      );
    });

    it('returns 400 for non-school-manager request', async () => {
      const memberRequestId = await createMemberRequest(
        tempCtx.memberReqInstructor,
        'INSTRUCTOR',
        SEED.schools.cloudbase,
      );

      await expectHttpError(
        approveSchoolManagerRequest({ requestId: memberRequestId }, ctx.systemAdmin),
        400,
        'This request is not a school manager request.',
      );
    });

    it('returns 403 for self-approval', async () => {
      const { requestId } = await createSchoolManagerRequest(ctx.systemAdmin, 'api-sm-self-approve');

      await expectHttpError(
        approveSchoolManagerRequest({ requestId }, ctx.systemAdmin),
        403,
        'You cannot approve your own registration request.',
      );
    });

    it('returns 404 for unknown request id', async () => {
      await expectHttpError(
        approveSchoolManagerRequest({ requestId: uniqueSuffix('missing-request') }, ctx.systemAdmin),
        404,
        'Registration request not found.',
      );
    });

    it('returns 409 when request is not pending', async () => {
      const { requestId } = await createSchoolManagerRequest(
        tempCtx.managerReqA,
        'api-sm-non-pending',
      );
      await approveSchoolManagerRequest({ requestId }, ctx.systemAdmin);

      await expectHttpError(
        approveSchoolManagerRequest({ requestId }, ctx.systemAdmin),
        409,
        'Only pending requests can be approved.',
      );
    });
  });

  describe('approveSchoolMemberRequest', () => {
    it('approves INSTRUCTOR request and provisions profile/account/role/decision', async () => {
      const requestId = await createMemberRequest(
        tempCtx.memberReqInstructor,
        'INSTRUCTOR',
        SEED.schools.cloudbase,
      );

      const result = (await approveSchoolMemberRequest(
        { requestId },
        ctx.schoolManager,
      )) as {
        requestId: string;
        approvedRole: 'INSTRUCTOR' | 'STUDENT';
      };

      expect(result.requestId).toBe(requestId);
      expect(result.approvedRole).toBe('INSTRUCTOR');

      const instructor = await prisma.instructor.findUnique({
        where: { userId: TEMP.users.memberReqInstructor.id },
        select: { id: true },
      });
      expect(instructor?.id).toBeTruthy();

      const account = await prisma.account.findFirst({
        where: {
          userId: TEMP.users.memberReqInstructor.id,
          schoolId: SEED.schools.cloudbase,
        },
        select: { id: true, currency: true },
      });
      expect(account?.id).toBeTruthy();
      expect(account?.currency).toBe('USD');

      const role = await prisma.userSchoolRole.findUnique({
        where: {
          userId_schoolId_role: {
            userId: TEMP.users.memberReqInstructor.id,
            schoolId: SEED.schools.cloudbase,
            role: 'INSTRUCTOR',
          },
        },
        select: {
          role: true,
          grantedByUserId: true,
          sourceRegistrationRequestId: true,
        },
      });
      expect(role?.role).toBe('INSTRUCTOR');
      expect(role?.grantedByUserId).toBe(SEED.users.schoolManager01);
      expect(role?.sourceRegistrationRequestId).toBe(requestId);

      const decision = await prisma.registrationRequestDecision.findFirst({
        where: { requestId, decisionType: 'APPROVED' },
        select: { reviewerId: true },
      });
      expect(decision?.reviewerId).toBe(SEED.users.schoolManager01);

      const request = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, reviewerId: true },
      });
      expect(request?.status).toBe('APPROVED');
      expect(request?.reviewerId).toBe(SEED.users.schoolManager01);
    });

    it('returns 403 for cross-school approve attempts', async () => {
      const otherSchoolId = await createSchoolOutsideManagerScope();
      const requestId = await createMemberRequest(
        tempCtx.memberReqInstructor,
        'INSTRUCTOR',
        otherSchoolId,
      );

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, ctx.schoolManager),
        403,
        'You can approve only requests for your own school.',
      );
    });

    it('returns 403 for self-approval', async () => {
      const requestId = await createMemberRequest(
        ctx.schoolManager,
        'INSTRUCTOR',
        SECONDARY_MANAGER_SCHOOL_ID,
      );

      await expect(
        approveSchoolMemberRequest({ requestId }, ctx.schoolManager),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('returns 400 for non-member request', async () => {
      const { requestId } = await createSchoolManagerRequest(
        tempCtx.managerReqB,
        'api-wrong-member-approve-type',
      );

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, ctx.schoolManager),
        400,
        'Only instructor/student requests can be approved here.',
      );
    });

    it('returns 404 for unknown request id', async () => {
      await expectHttpError(
        approveSchoolMemberRequest({ requestId: uniqueSuffix('missing-member-request') }, ctx.schoolManager),
        404,
        'Registration request not found.',
      );
    });

    it('returns 409 when request is not pending', async () => {
      const requestId = await createMemberRequest(
        tempCtx.memberReqInstructor,
        'INSTRUCTOR',
        SEED.schools.cloudbase,
      );
      await approveSchoolMemberRequest({ requestId }, ctx.schoolManager);

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, ctx.schoolManager),
        409,
        'Only pending requests can be approved.',
      );
    });
  });
});
