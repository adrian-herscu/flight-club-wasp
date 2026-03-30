/**
 * Starts the Wasp dev server in the background, writing its PID and piping
 * stdout/stderr to wasp-dev.log. Use via `npm run wasp:start:bg` in CI.
 *
 * The E2E global setup only polls for readiness; this script only spawns.
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const appDir = process.cwd();
const logPath = path.join(appDir, 'wasp-dev.log');
const pidPath = path.join(appDir, 'tests/e2e/.wasp-dev.pid');

fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.mkdirSync(path.dirname(pidPath), { recursive: true });

const out = fs.createWriteStream(logPath, { flags: 'a' });

const child = spawn('wasp', ['start'], {
  cwd: appDir,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

child.stdout.pipe(out);
child.stderr.pipe(out);
child.unref();

fs.writeFileSync(pidPath, String(child.pid));

console.log(`[wasp:start:bg] Wasp started in background (pid: ${child.pid})`);
console.log(`[wasp:start:bg] Logs: ${logPath}`);
