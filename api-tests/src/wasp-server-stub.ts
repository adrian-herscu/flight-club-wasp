/**
 * Wasp server stub — module resolution shim only.
 *
 * Wasp operations import { HttpError, prisma } from "wasp/server", a path that
 * only resolves inside a Wasp build. The vitest.config.ts alias redirects that
 * import here so Vitest can load operation files without a running Wasp build.
 *
 * This is NOT a mock:
 *   - HttpError is the identical class copied from the generated SDK source at
 *     app/.wasp/out/sdk/wasp/server/HttpError.ts — behaviour is preserved exactly.
 *   - prisma is a real PrismaClient connected to the database in .env.test —
 *     every operation runs real Prisma queries against real data.
 */

import { PrismaClient } from '@prisma/client';

// Identical to app/.wasp/out/sdk/wasp/server/HttpError.ts
export class HttpError extends Error {
  public statusCode: number;
  public data: unknown;

  constructor(
    statusCode: number,
    message?: string,
    data?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }

    this.name = this.constructor.name;

    if (!(Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600)) {
      throw new Error('statusCode has to be integer in range [400, 600).');
    }

    this.statusCode = statusCode;

    if (data) {
      this.data = data;
    }
  }
}

// Real client — DATABASE_URL is loaded from .env.test by src/setup.ts
export const prisma = new PrismaClient();
