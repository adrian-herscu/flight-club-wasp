/// <reference types="node" />
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appDir = path.resolve(__dirname, '../app');
const envTestPath = path.resolve(__dirname, '.env.test');

function readDatabaseUrlFromEnvTest(): string {
  const content = fs.readFileSync(envTestPath, 'utf8');
  const line = content
    .split('\n')
    .map((l: string) => l.trim())
    .find((l: string) => l.startsWith('DATABASE_URL='));

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

  console.log('[api-tests][globalSetup] Resetting database with Wasp DB reset...');
  execSync('wasp db reset --force', {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  console.log('[api-tests][globalSetup] Database reset complete.');
}
