import { execFileSync, execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import * as path from 'node:path';

const HOST = '127.0.0.1';
const WEB_PORT = 3000;
const API_PORT = 3001;
const WASP_PORTS = [WEB_PORT, API_PORT] as const;
const STARTUP_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;

const appDir = path.resolve(__dirname, '../app');
const schemaPath = path.join(appDir, 'schema.prisma');
const waspEnvPath = path.join(appDir, '.wasp/out/server/.env');
const logPath = path.join(appDir, 'wasp-dev.log');
const pidPath = path.resolve(__dirname, '.wasp-dev.pid');

function readDatabaseUrlFromWaspEnv(): string {
  const envDatabaseUrl = process.env.DATABASE_URL?.trim();
  if (envDatabaseUrl) {
    return envDatabaseUrl;
  }

  const envFileContent = fs.readFileSync(waspEnvPath, 'utf8');
  const line = envFileContent
    .split('\n')
    .map((rawLine) => rawLine.trim())
    .find((rawLine) => rawLine.startsWith('DATABASE_URL='));

  if (!line) {
    throw new Error(`[e2e][globalSetup] DATABASE_URL not found in ${waspEnvPath}`);
  }

  const value = line.slice('DATABASE_URL='.length).trim();
  const unquotedValue = value.replace(/^['\"](.*)['\"]$/, '$1');

  if (!unquotedValue) {
    throw new Error(`[e2e][globalSetup] DATABASE_URL is empty in ${waspEnvPath}`);
  }

  return unquotedValue;
}

function resetDatabase(): void {
  const databaseUrl = readDatabaseUrlFromWaspEnv();

  console.log('[e2e][globalSetup] Resetting database with Wasp DB reset...');
  execSync('wasp db reset --force', {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  console.log('[e2e][globalSetup] Database reset complete.');
}

function checkTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const onDone = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(700);
    socket.once('connect', () => onDone(true));
    socket.once('timeout', () => onDone(false));
    socket.once('error', () => onDone(false));
    socket.connect(port, host);
  });
}

function checkHttp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host,
        port,
        path: '/',
        timeout: 1000,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );

    req.once('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.once('error', () => resolve(false));
  });
}

async function isAppAlive(): Promise<boolean> {
  const [httpOk, tcpOk] = await Promise.all([
    checkHttp(HOST, WEB_PORT),
    checkTcp(HOST, API_PORT),
  ]);

  return httpOk && tcpOk;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readExistingPid(): number | null {
  try {
    const raw = fs.readFileSync(pidPath, 'utf8').trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function removePidFile(): void {
  try {
    fs.unlinkSync(pidPath);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== 'ENOENT') {
      throw error;
    }
  }
}

function killProcessUsingRecordedPid(): void {
  const existingPid = readExistingPid();
  if (!existingPid || !isProcessAlive(existingPid)) {
    removePidFile();
    return;
  }

  console.log(`[e2e][globalSetup] Stopping recorded Wasp process (pid: ${existingPid}).`);

  try {
    process.kill(existingPid, 'SIGTERM');
  } catch {
    removePidFile();
    return;
  }

  removePidFile();
}

function killProcessesUsingWaspPorts(): void {
  console.log(`[e2e][globalSetup] Killing processes using ports ${WASP_PORTS.join(', ')}.`);

  try {
    execFileSync('fuser', ['-k', ...WASP_PORTS.map((port) => `${port}/tcp`)], {
      stdio: 'inherit',
    });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException & { status?: number };
    if (typedError.code === 'ENOENT') {
      throw new Error('[e2e][globalSetup] Required command `fuser` is not available on PATH.');
    }

    if (typedError.status !== 1) {
      throw error;
    }
  }
}

function startWaspInBackground(): void {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
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

  console.log(`[e2e][globalSetup] Started Wasp server in background (pid: ${child.pid}).`);
  console.log(`[e2e][globalSetup] Logs: ${logPath}`);
}

async function startWaspAndWaitUntilReady(): Promise<void> {
  console.log('[e2e][globalSetup] Starting Wasp server...');
  startWaspInBackground();

  const startedAt = Date.now();
  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    if (await isAppAlive()) {
      console.log('[e2e][globalSetup] App is ready.');
      return;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('[e2e][globalSetup] Timeout waiting for Wasp app to become ready after restart.');
}

export default async function globalSetup() {
  killProcessUsingRecordedPid();
  killProcessesUsingWaspPorts();
  resetDatabase();
  await startWaspAndWaitUntilReady();
}
