import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup() {
  console.log('[e2e][globalSetup] Resetting database with `npm run db:reset`...');
  execSync('npm run db:reset', {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  console.log('[e2e][globalSetup] Database reset complete.');
}
