/**
 * Unit tests for src/server/guards.ts — authorized context wrappers.
 *
 * Each wrapper is tested for:
 *   - 401 when unauthenticated
 *   - 403 when the caller lacks the required role
 *   - handler NOT called when auth fails
 *   - handler called with the correct typed context on success
 *
 * Uses seeded data from:
 *   migrations/20260309103000_seed_users_by_role/
 *   migrations/20260309110000_seed_paragliding_workflows/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withAuthenticated,
  withSystemAdmin,
  withSchoolManager,
  withSyllabusOperator,
} from '../../src/server/guards.js';
import { ctx, SEED } from './testHelpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HttpErrorShape = { statusCode: number; message: string };

async function expectHttpError(
  promise: Promise<unknown>,
  statusCode: number,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ statusCode, message } satisfies HttpErrorShape);
}

// ---------------------------------------------------------------------------
// withAuthenticated
// ---------------------------------------------------------------------------

describe('withAuthenticated', () => {
  const handler = vi.fn(async () => 'ok');
  const op = withAuthenticated(handler);

  beforeEach(() => handler.mockClear());

  it('throws 401 for unauthenticated caller', async () => {
    await expectHttpError(op({}, ctx.unauthenticated), 401, 'Only authenticated users can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with { user } for authenticated caller', async () => {
    await op({}, ctx.user01);
    expect(handler).toHaveBeenCalledOnce();
    const [, receivedCtx] = handler.mock.calls[0];
    expect(receivedCtx.user.id).toBe(SEED.users.user01);
  });

  it('does not expose raw RequestContext to the handler', async () => {
    await op({}, ctx.user01);
    const [, receivedCtx] = handler.mock.calls[0];
    // The handler context has only { user } — no Wasp session wrapper
    expect(Object.keys(receivedCtx)).toEqual(['user']);
  });
});

// ---------------------------------------------------------------------------
// withSystemAdmin
// ---------------------------------------------------------------------------

describe('withSystemAdmin', () => {
  const handler = vi.fn(async () => 'ok');
  const op = withSystemAdmin(handler);

  beforeEach(() => handler.mockClear());

  it('throws 401 for unauthenticated caller', async () => {
    await expectHttpError(op({}, ctx.unauthenticated), 401, 'Only authenticated users can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for plain user', async () => {
    await expectHttpError(op({}, ctx.user01), 403, 'Only system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for school manager', async () => {
    await expectHttpError(op({}, ctx.schoolManager), 403, 'Only system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for instructor', async () => {
    await expectHttpError(op({}, ctx.instructor), 403, 'Only system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for student', async () => {
    await expectHttpError(op({}, ctx.student), 403, 'Only system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with { user } for system admin', async () => {
    await op({}, ctx.systemAdmin);
    expect(handler).toHaveBeenCalledOnce();
    const [, receivedCtx] = handler.mock.calls[0];
    expect(receivedCtx.user.id).toBe(SEED.users.systemAdmin01);
  });
});

// ---------------------------------------------------------------------------
// withSchoolManager
// ---------------------------------------------------------------------------

describe('withSchoolManager', () => {
  const handler = vi.fn(async () => 'ok');
  const op = withSchoolManager(handler);

  beforeEach(() => handler.mockClear());

  it('throws 401 for unauthenticated caller', async () => {
    await expectHttpError(op({}, ctx.unauthenticated), 401, 'Only authenticated users can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for plain user (no school role)', async () => {
    await expectHttpError(op({}, ctx.user01), 403, 'Only school managers can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for system admin (isSystemAdmin does not grant SCHOOL_MANAGER)', async () => {
    await expectHttpError(op({}, ctx.systemAdmin), 403, 'Only school managers can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for instructor (not a manager)', async () => {
    await expectHttpError(op({}, ctx.instructor), 403, 'Only school managers can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for student (not a manager)', async () => {
    await expectHttpError(op({}, ctx.student), 403, 'Only school managers can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with { user, school } for school manager', async () => {
    await op({ schoolId: SEED.schools.cloudbase }, ctx.schoolManager);
    expect(handler).toHaveBeenCalledOnce();
    const [, receivedCtx] = handler.mock.calls[0];
    expect(receivedCtx.user.id).toBe(SEED.users.schoolManager01);
    expect(receivedCtx.school.id).toBe(SEED.schools.cloudbase);
  });

  it('throws 403 when schoolId in args belongs to a different school', async () => {
    await expectHttpError(
      op({ schoolId: 'non-existent-school-id' }, ctx.schoolManager),
      403,
      'Selected school is not managed by this account.',
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('resolves default school when no schoolId in args', async () => {
    await op({}, ctx.schoolManager);
    expect(handler).toHaveBeenCalledOnce();
    const [, receivedCtx] = handler.mock.calls[0];
    expect(receivedCtx.school.id).toBe(SEED.schools.cloudbase);
  });
});

// ---------------------------------------------------------------------------
// withSyllabusOperator
// ---------------------------------------------------------------------------

describe('withSyllabusOperator', () => {
  const handler = vi.fn(async () => 'ok');
  const op = withSyllabusOperator(handler);

  beforeEach(() => handler.mockClear());

  it('throws 401 for unauthenticated caller', async () => {
    await expectHttpError(op({}, ctx.unauthenticated), 401, 'Only authenticated users can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for plain user', async () => {
    await expectHttpError(op({}, ctx.user01), 403, 'Only school managers and system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for instructor', async () => {
    await expectHttpError(op({}, ctx.instructor), 403, 'Only school managers and system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws 403 for student', async () => {
    await expectHttpError(op({}, ctx.student), 403, 'Only school managers and system admins can access this resource.');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with { user, school: null } for system admin', async () => {
    await op({}, ctx.systemAdmin);
    expect(handler).toHaveBeenCalledOnce();
    const [, receivedCtx] = handler.mock.calls[0];
    expect(receivedCtx.user.id).toBe(SEED.users.systemAdmin01);
    expect(receivedCtx.school).toBeNull();
  });

  it('calls handler with { user, school } for school manager', async () => {
    await op({ schoolId: SEED.schools.cloudbase }, ctx.schoolManager);
    expect(handler).toHaveBeenCalledOnce();
    const [, receivedCtx] = handler.mock.calls[0];
    expect(receivedCtx.user.id).toBe(SEED.users.schoolManager01);
    expect(receivedCtx.school.id).toBe(SEED.schools.cloudbase);
  });

  it('school in context includes accounts for the manager', async () => {
    await op({ schoolId: SEED.schools.cloudbase }, ctx.schoolManager);
    const [, receivedCtx] = handler.mock.calls[0];
    // SchoolWithAccounts shape — accounts array must be present
    expect(Array.isArray(receivedCtx.school?.accounts)).toBe(true);
  });
});
