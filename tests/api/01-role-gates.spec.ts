import { describe, it, expect } from 'vitest';

import {
  approveSchoolManagerRequest,
  approveSchoolMemberRequest,
} from '../../src/registration/operations.js';
import { ctx } from './testHelpers.js';

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

describe('4.2 / 4.4 / 4.5 role-gate authorization (API)', () => {
  describe('[STD-AUTH-009][STD-ADM-006] approveSchoolManagerRequest', () => {
    const args = { requestId: 'not-a-real-id' };

    it('returns 401 for unauthenticated callers', async () => {
      await expectHttpError(
        approveSchoolManagerRequest(args, ctx.unauthenticated),
        401,
        'Only authenticated users can access this resource.',
      );
    });

    it('returns 403 for plain USER role', async () => {
      await expectHttpError(
        approveSchoolManagerRequest(args, ctx.user01),
        403,
        'Only system admins can access this resource.',
      );
    });

    it('returns 403 for SCHOOL_MANAGER role', async () => {
      await expectHttpError(
        approveSchoolManagerRequest(args, ctx.schoolManager),
        403,
        'Only system admins can access this resource.',
      );
    });

    it('returns 403 for INSTRUCTOR role', async () => {
      await expectHttpError(
        approveSchoolManagerRequest(args, ctx.instructor),
        403,
        'Only system admins can access this resource.',
      );
    });

    it('returns 403 for STUDENT role', async () => {
      await expectHttpError(
        approveSchoolManagerRequest(args, ctx.student),
        403,
        'Only system admins can access this resource.',
      );
    });
  });

  describe('[STD-AUTH-009][STD-MGR-011] approveSchoolMemberRequest', () => {
    const args = { requestId: 'not-a-real-id' };

    it('returns 401 for unauthenticated callers', async () => {
      await expectHttpError(
        approveSchoolMemberRequest(args, ctx.unauthenticated),
        401,
        'Only authenticated users can access this resource.',
      );
    });

    it('returns 403 for plain USER role', async () => {
      await expectHttpError(
        approveSchoolMemberRequest(args, ctx.user01),
        403,
        'Only school managers can access this resource.',
      );
    });

    it('returns 403 for SYSTEM_ADMIN role', async () => {
      await expectHttpError(
        approveSchoolMemberRequest(args, ctx.systemAdmin),
        403,
        'Only school managers can access this resource.',
      );
    });

    it('returns 403 for INSTRUCTOR role', async () => {
      await expectHttpError(
        approveSchoolMemberRequest(args, ctx.instructor),
        403,
        'Only school managers can access this resource.',
      );
    });

    it('returns 403 for STUDENT role', async () => {
      await expectHttpError(
        approveSchoolMemberRequest(args, ctx.student),
        403,
        'Only school managers can access this resource.',
      );
    });
  });
});
