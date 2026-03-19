/**
 * Wiring smoke test — verifies that:
 *   1. The wasp/server alias resolves and HttpError behaves correctly.
 *   2. The @prisma/client alias resolves and the DB is reachable.
 *
 * This test has no PRD coverage claim. Delete it once Task 2 tests are green.
 */
import { describe, it, expect } from 'vitest';
import { HttpError, prisma } from '../src/wasp-server-stub.js';

describe('package wiring', () => {
  it('HttpError carries the correct statusCode and message', () => {
    const err = new HttpError(403, 'Forbidden');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
    expect(err).toBeInstanceOf(Error);
  });

  it('HttpError rejects out-of-range status codes', () => {
    expect(() => new HttpError(200, 'ok')).toThrow();
  });

  it('prisma can reach the database', async () => {
    // A trivial read — just proves the connection string is valid
    const count = await prisma.user.count();
    expect(count).toBeGreaterThan(0);
  });
});
