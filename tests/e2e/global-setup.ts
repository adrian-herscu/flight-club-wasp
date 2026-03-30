import * as http from 'node:http';
import * as net from 'node:net';

const HOST = '127.0.0.1';
const WEB_PORT = 3000;
const API_PORT = 3001;
const STARTUP_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;

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

export default async function globalSetup() {
  console.log('[e2e][globalSetup] Waiting for app to become ready...');
  const startedAt = Date.now();
  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    if (await isAppAlive()) {
      console.log('[e2e][globalSetup] App is ready.');
      return;
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error('[e2e][globalSetup] Timeout waiting for app to become ready.');
}
