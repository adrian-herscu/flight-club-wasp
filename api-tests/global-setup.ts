import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appDir = path.resolve(__dirname, '../app');
const schemaPath = path.join(appDir, 'schema.prisma');
const envTestPath = path.resolve(__dirname, '.env.test');

function readDatabaseUrlFromEnvTest(): string {
  const content = fs.readFileSync(envTestPath, 'utf8');
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('DATABASE_URL='));

  if (!line) {
    throw new Error(`[api-tests][globalSetup] DATABASE_URL not found in ${envTestPath}`);
  }

  const value = line.slice('DATABASE_URL='.length).trim();
  const unquoted = value.replace(/^['"](.*)['"]{1}$/, '$1');

  if (!unquoted) {
    throw new Error(`[api-tests][globalSetup] DATABASE_URL is empty in ${envTestPath}`);
  }

  return unquoted;
}

export default function globalSetup() {
  const databaseUrl = readDatabaseUrlFromEnvTest();
  const quotedSchemaPath = JSON.stringify(schemaPath);

  console.log('[api-tests][globalSetup] Resetting database with Prisma migrate reset...');
  execSync(`npx prisma migrate reset --force --schema=${quotedSchemaPath}`, {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  console.log('[api-tests][globalSetup] Database reset complete.');
}
