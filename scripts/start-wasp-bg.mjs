/**
 * Starts the Wasp dev server in the background, writing its PID and redirecting
 * stdout/stderr to out/wasp-dev.log. Use via `npm run wasp:start:bg` in CI.
 *
 * The E2E global setup only polls for readiness; this script only spawns.
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const appDir = process.cwd();
const outDir = path.join(appDir, 'out');
const logPath = path.join(outDir, 'wasp-dev.log');
const pidPath = path.join(outDir, '.wasp-dev.pid');

fs.mkdirSync(outDir, { recursive: true });

const logFd = fs.openSync(logPath, 'a');

const child = spawn('wasp', ['start'], {
  cwd: appDir,
  detached: true,
  stdio: ['ignore', logFd, logFd],
  env: process.env,
});

child.unref();
fs.closeSync(logFd);

fs.writeFileSync(pidPath, String(child.pid));

console.log(`[wasp:start:bg] Wasp started in background (pid: ${child.pid})`);
console.log(`[wasp:start:bg] Logs: ${logPath}`);
