import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  console.log('[api-tests][globalSetup] Resetting database with `npm run db:reset`...');

  execSync('npm run db:reset', {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  console.log('[api-tests][globalSetup] Database reset complete.');
}
