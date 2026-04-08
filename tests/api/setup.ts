/**
 * Per-worker setup — runs once per worker before any test file in that worker.
 *
 * Receives the DATABASE_URL from the global container setup via Vitest's
 * provide/inject mechanism and sets it on process.env so that PrismaClient
 * (instantiated in wasp-server-stub.ts) picks it up.
 */

import { inject } from 'vitest';

const databaseUrl = inject('databaseUrl') as string;
process.env.DATABASE_URL = databaseUrl;
