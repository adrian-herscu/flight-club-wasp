import { beforeAll, describe, expect, it } from 'vitest';

import {
  approveSchoolManagerRequest,
  approveSchoolMemberRequest,
  getPendingSchoolManagerRequests,
  getPendingSchoolMemberRequests,
  rejectSchoolManagerRequest,
  rejectSchoolMemberRequest,
  submitRegistrationRequest,
} from '../../src/registration/operations.js';
import {
  ctx,
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
  namePrefix: string,
): Promise<string> {
  const schoolName = uniqueSuffix(namePrefix);

  await submitRegistrationRequest(
    {
      fullName: 'API Requester',
      phone: '+1 555 3001',
      requestedRole: 'SCHOOL_MANAGER',
      requestedSchoolName: schoolName,
      requestedWebsiteUrl: 'https://api-school.example.test',
      requestedAddressLine1: '10 Alpine Way',
      requestedCity: 'Annecy',
      requestedPostalCode: '74000',
      requestedCountry: 'FR',
      requestedCurrency: 'EUR',
    },
    requesterContext as any,
  );

  const created = await prisma.registrationRequest.findFirst({
    where: {
      requesterId: requesterContext.user!.id,
      requestedRole: 'SCHOOL_MANAGER',
      requestedSchoolName: schoolName,
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  expect(created?.id).toBeDefined();
  return created!.id;
}

async function createMemberRequest(
  requesterContext: { user: { id: string } | null },
  role: 'INSTRUCTOR' | 'STUDENT',
  schoolId: string,
): Promise<string> {
  await submitRegistrationRequest(
    {
      fullName: `API ${role} Requester`,
      phone: '+1 555 3002',
      requestedRole: role,
      targetSchoolId: schoolId,
    },
    requesterContext as any,
  );

  const created = await prisma.registrationRequest.findFirst({
    where: {
      requesterId: requesterContext.user!.id,
      requestedRole: role,
      targetSchoolId: schoolId,
      status: 'PENDING',
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  expect(created?.id).toBeDefined();
  return created!.id;
}

describe('4.4 / 4.5 rejection and listing behavior (API)', () => {
  describe('rejectSchoolManagerRequest', () => {
    it('[STD-ADM-004] rejects a pending school-manager request and persists reason', async () => {
      const requester = await createTestUser();
      const requestId = await createSchoolManagerRequest(requester.ctx, 'api-sm-reject');
      const reason = 'Missing legal documents';

      await rejectSchoolManagerRequest({ requestId, rejectionReason: reason }, ctx.systemAdmin);

      const updated = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, rejectionReason: true, reviewerId: true },
      });

      expect(updated?.status).toBe('REJECTED');
      expect(updated?.rejectionReason).toBe(reason);

      const decision = await prisma.registrationRequestDecision.findFirst({
        where: { requestId, decisionType: 'REJECTED' },
        select: { reason: true },
      });

      expect(decision?.reason).toBe(reason);
    });

    it('returns 404 for unknown request id', async () => {
      await expectHttpError(
        rejectSchoolManagerRequest(
          { requestId: uniqueSuffix('missing-request'), rejectionReason: 'N/A' },
          ctx.systemAdmin,
        ),
        404,
        'Registration request not found.',
      );
    });

    it('returns 409 when request is not pending', async () => {
      const requester = await createTestUser();
      const requestId = await createSchoolManagerRequest(requester.ctx, 'api-sm-approved');
      await approveSchoolManagerRequest({ requestId }, ctx.systemAdmin);

      await expectHttpError(
        rejectSchoolManagerRequest({ requestId, rejectionReason: 'Too late' }, ctx.systemAdmin),
        409,
        'Only pending requests can be rejected.',
      );
    });

    it('returns 403 when reviewer tries to reject own request', async () => {
      const requestId = await createSchoolManagerRequest(ctx.systemAdmin, 'api-sm-self');

      await expectHttpError(
        rejectSchoolManagerRequest({ requestId, rejectionReason: 'Self review' }, ctx.systemAdmin),
        403,
        'You cannot reject your own registration request.',
      );
    });

    it('returns 400 for non-school-manager request', async () => {
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', mgr.school.id);

      await expectHttpError(
        rejectSchoolManagerRequest({ requestId, rejectionReason: 'Wrong type' }, ctx.systemAdmin),
        400,
        'This request is not a school manager request.',
      );
    });

    it('lists only pending/approved school-manager requests (excludes rejected)', async () => {
      const requesterA = await createTestUser();
      const requesterB = await createTestUser();
      const requesterC = await createTestUser();

      const pendingId = await createSchoolManagerRequest(requesterA.ctx, 'api-sm-pending');
      const approvedId = await createSchoolManagerRequest(requesterB.ctx, 'api-sm-approved-list');
      const rejectedId = await createSchoolManagerRequest(requesterC.ctx, 'api-sm-rejected-list');

      await approveSchoolManagerRequest({ requestId: approvedId }, ctx.systemAdmin);
      await rejectSchoolManagerRequest(
        { requestId: rejectedId, rejectionReason: 'Rejected for test' },
        ctx.systemAdmin,
      );

      const rows = (await getPendingSchoolManagerRequests({}, ctx.systemAdmin)) as Array<{
        id: string;
        status: string;
      }>;

      const ids = rows.map((row) => row.id);
      expect(ids).toContain(pendingId);
      expect(ids).toContain(approvedId);
      expect(ids).not.toContain(rejectedId);
      expect(rows.every((row) => row.status === 'PENDING' || row.status === 'APPROVED')).toBe(true);
    });
  });

  describe('rejectSchoolMemberRequest + getPendingSchoolMemberRequests', () => {
    it('rejects a pending member request and persists reason', async () => {
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', mgr.school.id);
      const reason = 'Missing certification';

      await rejectSchoolMemberRequest({ requestId, rejectionReason: reason }, mgr.user.ctx);

      const updated = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, rejectionReason: true, reviewerId: true },
      });

      expect(updated?.status).toBe('REJECTED');
      expect(updated?.rejectionReason).toBe(reason);
      expect(updated?.reviewerId).toBe(mgr.user.id);
    });

    it('returns 403 for cross-school reject attempts', async () => {
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', outsideMgr.school.id);

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Cross-school' }, mgr.user.ctx),
        403,
        'You can reject only requests for your own school.',
      );
    });

    it('returns 403 when manager tries to reject own request', async () => {
      const requestId = await createMemberRequest(mgr.user.ctx, 'INSTRUCTOR', mgr.school.id);

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Self review' }, mgr.user.ctx),
        403,
        'You cannot reject your own registration request.',
      );
    });

    it('returns 400 for school-manager request in member reject operation', async () => {
      const requester = await createTestUser();
      const requestId = await createSchoolManagerRequest(requester.ctx, 'api-wrong-member-type');

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Wrong type' }, mgr.user.ctx),
        400,
        'Only instructor/student requests can be rejected here.',
      );
    });

    it('returns 409 when member request is not pending', async () => {
      const requester = await createTestUser();
      const requestId = await createMemberRequest(requester.ctx, 'INSTRUCTOR', mgr.school.id);
      await approveSchoolMemberRequest({ requestId }, mgr.user.ctx);

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Too late' }, mgr.user.ctx),
        409,
        'Only pending requests can be rejected.',
      );
    });

    it('[STD-MGR-010] lists only manager-school member requests with pending/approved status', async () => {
      const requesterA = await createTestUser();
      const requesterB = await createTestUser();
      const requesterC = await createTestUser();

      const pendingId = await createMemberRequest(requesterA.ctx, 'INSTRUCTOR', mgr.school.id);

      const approvedId = await createMemberRequest(requesterB.ctx, 'INSTRUCTOR', mgr.school.id);
      await approveSchoolMemberRequest({ requestId: approvedId }, mgr.user.ctx);

      const rejectedId = await createMemberRequest(requesterC.ctx, 'INSTRUCTOR', mgr.school.id);
      await rejectSchoolMemberRequest(
        { requestId: rejectedId, rejectionReason: 'Rejected for test' },
        mgr.user.ctx,
      );

      const outsideRequester = await createTestUser();
      const outsideScopeId = await createMemberRequest(
        outsideRequester.ctx,
        'INSTRUCTOR',
        outsideMgr.school.id,
      );

      const rows = (await getPendingSchoolMemberRequests(
        { schoolId: mgr.school.id },
        mgr.user.ctx,
      )) as Array<{
        id: string;
        status: string;
        targetSchool: { id: string } | null;
      }>;

      const ids = rows.map((row) => row.id);
      expect(ids).toContain(pendingId);
      expect(ids).toContain(approvedId);
      expect(ids).not.toContain(rejectedId);
      expect(ids).not.toContain(outsideScopeId);
      expect(rows.every((row) => row.targetSchool?.id === mgr.school.id)).toBe(true);
      expect(rows.every((row) => row.status === 'PENDING' || row.status === 'APPROVED')).toBe(true);
    });
  });
});
