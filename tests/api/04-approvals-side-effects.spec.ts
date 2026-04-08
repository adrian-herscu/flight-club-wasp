import { beforeAll, describe, expect, it } from 'vitest';

import {
  approveSchoolManagerRequest,
  approveSchoolMemberRequest,
  submitRegistrationRequest,
} from '../../src/registration/operations.js';
import {
  ctx,
  SEED,
  createIsolatedSchoolManager,
  createTestUser,
  type IsolatedSchoolManager,
} from './testHelpers.js';
import { prisma } from './wasp-server-stub.js';

// ---------------------------------------------------------------------------
// Isolated test state — created once per file, never shared across files
// ---------------------------------------------------------------------------

let mgr: IsolatedSchoolManager;
let outsideMgr: IsolatedSchoolManager;

beforeAll(async () => {
  mgr = await createIsolatedSchoolManager();
  outsideMgr = await createIsolatedSchoolManager();
});

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

describe('4.4 / 4.5 approval side effects and guardrails (API)', () => {
  describe('approveSchoolManagerRequest', () => {
    it('[STD-ADM-003] approves pending request and provisions school/account/role/decision', async () => {
      const requester = await createTestUser();
      const { requestId, schoolName } = await createSchoolManagerRequest(
        requester.ctx,
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
      expect(school?.adminId).toBe(requester.id);
      expect(school?.country).toBe('CH');
      expect(school?.currency).toBe('CHF');

      const account = await prisma.account.findFirst({
        where: {
          userId: requester.id,
          schoolId: result.approvedSchoolId,
        },
        select: { id: true, currency: true },
      });
      expect(account?.id).toBeTruthy();
      expect(account?.currency).toBe('CHF');

      const role = await prisma.userSchoolRole.findUnique({
        where: {
          userId_schoolId_role: {
            userId: requester.id,
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

      const dbRequest = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, reviewerId: true, approvedSchoolId: true },
      });
      expect(dbRequest?.status).toBe('APPROVED');
      expect(dbRequest?.reviewerId).toBe(SEED.users.systemAdmin01);
      expect(dbRequest?.approvedSchoolId).toBe(result.approvedSchoolId);
    });

    it('returns 400 when school details are incomplete', async () => {
      const requester = await createTestUser();
      const requestId = await createIncompleteSchoolManagerRequest(requester.ctx);

      await expectHttpError(
        approveSchoolManagerRequest({ requestId }, ctx.systemAdmin),
        400,
        'School details are incomplete for this request.',
      );
    });

    it('returns 400 for non-school-manager request', async () => {
      const requester = await createTestUser();
      const memberRequestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', mgr.school.id);

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
      const requester = await createTestUser();
      const { requestId } = await createSchoolManagerRequest(requester.ctx, 'api-sm-non-pending');
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
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', mgr.school.id);

      const result = (await approveSchoolMemberRequest(
        { requestId },
        mgr.user.ctx,
      )) as {
        requestId: string;
        approvedRole: 'INSTRUCTOR' | 'STUDENT';
      };

      expect(result.requestId).toBe(requestId);
      expect(result.approvedRole).toBe('INSTRUCTOR');

      const instructor = await prisma.instructor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      expect(instructor?.id).toBeTruthy();

      const account = await prisma.account.findFirst({
        where: {
          userId: requester.id,
          schoolId: mgr.school.id,
        },
        select: { id: true, currency: true },
      });
      expect(account?.id).toBeTruthy();
      expect(account?.currency).toBe(mgr.school.currency);

      const role = await prisma.userSchoolRole.findUnique({
        where: {
          userId_schoolId_role: {
            userId: requester.id,
            schoolId: mgr.school.id,
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
      expect(role?.grantedByUserId).toBe(mgr.user.id);
      expect(role?.sourceRegistrationRequestId).toBe(requestId);

      const decision = await prisma.registrationRequestDecision.findFirst({
        where: { requestId, decisionType: 'APPROVED' },
        select: { reviewerId: true },
      });
      expect(decision?.reviewerId).toBe(mgr.user.id);

      const dbRequest = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, reviewerId: true },
      });
      expect(dbRequest?.status).toBe('APPROVED');
      expect(dbRequest?.reviewerId).toBe(mgr.user.id);
    });

    it('returns 403 for cross-school approve attempts', async () => {
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', outsideMgr.school.id);

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, mgr.user.ctx),
        403,
        'You can approve only requests for your own school.',
      );
    });

    it('returns 403 for self-approval', async () => {
      const requestId = await createMemberRequest(mgr.user.ctx, 'INSTRUCTOR', mgr.school.id);

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, mgr.user.ctx),
        403,
        'You cannot approve your own registration request.',
      );
    });

    it('returns 400 for non-member request', async () => {
      const requester = await createTestUser();
      const { requestId } = await createSchoolManagerRequest(requester.ctx, 'api-wrong-member-approve-type');

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, mgr.user.ctx),
        400,
        'Only instructor/student requests can be approved here.',
      );
    });

    it('returns 404 for unknown request id', async () => {
      await expectHttpError(
        approveSchoolMemberRequest({ requestId: uniqueSuffix('missing-member-request') }, mgr.user.ctx),
        404,
        'Registration request not found.',
      );
    });

    it('returns 409 when request is not pending', async () => {
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', mgr.school.id);
      await approveSchoolMemberRequest({ requestId }, mgr.user.ctx);

      await expectHttpError(
        approveSchoolMemberRequest({ requestId }, mgr.user.ctx),
        409,
        'Only pending requests can be approved.',
      );
    });
  });
});
