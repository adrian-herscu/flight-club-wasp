import { beforeEach, describe, expect, it } from 'vitest';

import {
  approveSchoolManagerRequest,
  approveSchoolMemberRequest,
  getPendingSchoolManagerRequests,
  getPendingSchoolMemberRequests,
  rejectSchoolManagerRequest,
  rejectSchoolMemberRequest,
  submitRegistrationRequest,
} from '../../src/registration/operations.js';
import { ctx, SEED } from './testHelpers.js';
import { prisma } from './wasp-server-stub.js';

const TEMP = {
  users: {
    requesterA: {
      id: 'api-temp-requester-a',
      email: 'api.temp.requester.a@example.test',
    },
    requesterB: {
      id: 'api-temp-requester-b',
      email: 'api.temp.requester.b@example.test',
    },
    requesterC: {
      id: 'api-temp-requester-c',
      email: 'api.temp.requester.c@example.test',
    },
  },
} as const;

const tempCtx = {
  requesterA: { user: { id: TEMP.users.requesterA.id, role: 'USER' as const } },
  requesterB: { user: { id: TEMP.users.requesterB.id, role: 'USER' as const } },
  requesterC: { user: { id: TEMP.users.requesterC.id, role: 'USER' as const } },
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

async function createSchoolOutsideManagerScope(): Promise<string> {
  const id = uniqueSuffix('api-school-outside-scope');
  await prisma.school.create({
    data: {
      id,
      name: `Outside Scope ${Date.now()}`,
      addressLine1: '1 Remote Road',
      city: 'Lyon',
      postalCode: '69000',
      country: 'FR',
      currency: 'EUR',
      adminId: SEED.users.systemAdmin01,
    },
  });
  return id;
}

async function safeCleanupForThisSpec(): Promise<void> {
  const tempUserIds = [
    TEMP.users.requesterA.id,
    TEMP.users.requesterB.id,
    TEMP.users.requesterC.id,
    SEED.users.schoolManager01,
    SEED.users.systemAdmin01,
  ];

  // Ensure temp users exist and are reset to plain USER before each test.
  for (const tempUser of Object.values(TEMP.users)) {
    await prisma.user.upsert({
      where: { id: tempUser.id },
      update: {
        email: tempUser.email,
        role: 'USER',
      },
      create: {
        id: tempUser.id,
        email: tempUser.email,
        role: 'USER',
      },
    });
  }

  // Delete decisions and requests produced by this file only.
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

  // Remove test-created school roles for temp users and for reviewer self-tests.
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

  // Reset any elevated effective roles back to defaults for users touched here.
  await prisma.user.updateMany({
    where: { id: { in: [TEMP.users.requesterA.id, TEMP.users.requesterB.id, TEMP.users.requesterC.id] } },
    data: { role: 'USER' },
  });

  await prisma.user.update({
    where: { id: SEED.users.schoolManager01 },
    data: { role: 'SCHOOL_MANAGER' },
  });

  await prisma.user.update({
    where: { id: SEED.users.systemAdmin01 },
    data: { role: 'SYSTEM_ADMIN' },
  });
}

describe('4.4 / 4.5 rejection and listing behavior (API)', () => {
  beforeEach(async () => {
    await safeCleanupForThisSpec();
  });

  describe('rejectSchoolManagerRequest', () => {
    it('[STD-ADM-004] rejects a pending school-manager request and persists reason', async () => {
      const requestId = await createSchoolManagerRequest(tempCtx.requesterA, 'api-sm-reject');
      const reason = 'Missing legal documents';

      await rejectSchoolManagerRequest({ requestId, rejectionReason: reason }, ctx.systemAdmin);

      const updated = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, rejectionReason: true, reviewerId: true },
      });

      expect(updated?.status).toBe('REJECTED');
      expect(updated?.rejectionReason).toBe(reason);
      expect(updated?.reviewerId).toBe(SEED.users.systemAdmin01);

      const decision = await prisma.registrationRequestDecision.findFirst({
        where: { requestId, decisionType: 'REJECTED' },
        select: { reason: true, reviewerId: true },
      });

      expect(decision?.reason).toBe(reason);
      expect(decision?.reviewerId).toBe(SEED.users.systemAdmin01);
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
      const requestId = await createSchoolManagerRequest(tempCtx.requesterA, 'api-sm-approved');
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
      const requestId = await createMemberRequest(
        tempCtx.requesterA,
        'STUDENT',
        SEED.schools.cloudbase,
      );

      await expectHttpError(
        rejectSchoolManagerRequest({ requestId, rejectionReason: 'Wrong type' }, ctx.systemAdmin),
        400,
        'This request is not a school manager request.',
      );
    });

    it('lists only pending/approved school-manager requests (excludes rejected)', async () => {
      const pendingId = await createSchoolManagerRequest(tempCtx.requesterA, 'api-sm-pending');
      const approvedId = await createSchoolManagerRequest(tempCtx.requesterB, 'api-sm-approved-list');
      const rejectedId = await createSchoolManagerRequest(tempCtx.requesterC, 'api-sm-rejected-list');

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
      const requestId = await createMemberRequest(tempCtx.requesterA, 'STUDENT', SEED.schools.cloudbase);
      const reason = 'Missing certification';

      await rejectSchoolMemberRequest({ requestId, rejectionReason: reason }, ctx.schoolManager);

      const updated = await prisma.registrationRequest.findUnique({
        where: { id: requestId },
        select: { status: true, rejectionReason: true, reviewerId: true },
      });

      expect(updated?.status).toBe('REJECTED');
      expect(updated?.rejectionReason).toBe(reason);
      expect(updated?.reviewerId).toBe(SEED.users.schoolManager01);
    });

    it('returns 403 for cross-school reject attempts', async () => {
      const otherSchoolId = await createSchoolOutsideManagerScope();
      const requestId = await createMemberRequest(tempCtx.requesterA, 'INSTRUCTOR', otherSchoolId);

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Cross-school' }, ctx.schoolManager),
        403,
        'You can reject only requests for your own school.',
      );
    });

    it('returns 403 when manager tries to reject own request', async () => {
      const requestId = await createMemberRequest(
        ctx.schoolManager,
        'INSTRUCTOR',
        SEED.schools.cloudbase,
      );

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Self review' }, ctx.schoolManager),
        403,
        'You cannot reject your own registration request.',
      );
    });

    it('returns 400 for school-manager request in member reject operation', async () => {
      const requestId = await createSchoolManagerRequest(tempCtx.requesterA, 'api-wrong-member-type');

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Wrong type' }, ctx.schoolManager),
        400,
        'Only instructor/student requests can be rejected here.',
      );
    });

    it('returns 409 when member request is not pending', async () => {
      const requestId = await createMemberRequest(tempCtx.requesterA, 'STUDENT', SEED.schools.cloudbase);
      await approveSchoolMemberRequest({ requestId }, ctx.schoolManager);

      await expectHttpError(
        rejectSchoolMemberRequest({ requestId, rejectionReason: 'Too late' }, ctx.schoolManager),
        409,
        'Only pending requests can be rejected.',
      );
    });

    it('[STD-MGR-010] lists only manager-school member requests with pending/approved status', async () => {
      const pendingCloudbaseId = await createMemberRequest(
        tempCtx.requesterA,
        'STUDENT',
        SEED.schools.cloudbase,
      );

      const approvedCloudbaseId = await createMemberRequest(
        tempCtx.requesterB,
        'STUDENT',
        SEED.schools.cloudbase,
      );
      await approveSchoolMemberRequest({ requestId: approvedCloudbaseId }, ctx.schoolManager);

      const rejectedCloudbaseId = await createMemberRequest(
        tempCtx.requesterC,
        'STUDENT',
        SEED.schools.cloudbase,
      );
      await rejectSchoolMemberRequest(
        { requestId: rejectedCloudbaseId, rejectionReason: 'Rejected for test' },
        ctx.schoolManager,
      );

      const otherSchoolId = await createSchoolOutsideManagerScope();
      const outsideScopeId = await createMemberRequest(tempCtx.requesterB, 'INSTRUCTOR', otherSchoolId);

      const rows = (await getPendingSchoolMemberRequests({}, ctx.schoolManager)) as Array<{
        id: string;
        status: string;
        targetSchool: { id: string } | null;
      }>;

      const ids = rows.map((row) => row.id);
      expect(ids).toContain(pendingCloudbaseId);
      expect(ids).toContain(approvedCloudbaseId);
      expect(ids).not.toContain(rejectedCloudbaseId);
      expect(ids).not.toContain(outsideScopeId);
      expect(rows.every((row) => row.targetSchool?.id === SEED.schools.cloudbase)).toBe(true);
      expect(rows.every((row) => row.status === 'PENDING' || row.status === 'APPROVED')).toBe(true);
    });
  });
});
