/**
 * Global test container setup — runs once before any test worker starts.
 *
 * Starts a single PostgreSQL container, runs all Prisma migrations (including
 * seed migrations), then provides the connection URL to every worker via the
 * Vitest provide/inject mechanism.
 *
 * The container is stopped after the full test run completes.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

let container: StartedPostgreSqlContainer;

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('flight_club_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl: string = container.getConnectionUri();

  execSync('npx prisma migrate deploy --schema schema.prisma', {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  provide('databaseUrl', databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
