import { serve } from '@hono/node-server';
import type { AddressInfo } from 'node:net';
import { DaemonReadyLine, type DaemonRecord } from '@ps/contracts';
import { loadConfig } from './config.js';
import { claimRecord, isAlive, readRecord, removeRecord } from './record.js';
import { EventBus } from './bus.js';
import { createApp } from './server.js';

const HEARTBEAT_MS = 15_000;

function announce(record: DaemonRecord): void {
  process.stdout.write(JSON.stringify(DaemonReadyLine.parse(record)) + '\n');
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const config = loadConfig();

  const existing = await readRecord(config.recordPath);
  if (existing) {
    if (await isAlive(existing)) {
      console.error(`[daemon] already running on port ${existing.port}, deferring`);
      announce(existing);
      return;
    }
    console.error('[daemon] found a stale daemon.json, taking over');
    await removeRecord(config.recordPath);
  }

  const bus = new EventBus();
  const app = createApp({ config, bus, startedAt });
  const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port });
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as AddressInfo;

  const record: DaemonRecord = {
    type: 'daemon-ready',
    host: config.host,
    port: address.port,
    token: config.token,
    pid: process.pid,
    dataDir: config.dataDir,
    startedAt,
  };

  if ((await claimRecord(config.recordPath, record)) === 'taken') {
    const winner = await readRecord(config.recordPath);
    if (winner && (await isAlive(winner))) {
      console.error('[daemon] lost the race for this data root, standing down');
      server.close();
      announce(winner);
      return;
    }
    await removeRecord(config.recordPath);
    await claimRecord(config.recordPath, record);
  }

  announce(record);
  console.error(`[daemon] listening on http://${config.host}:${address.port}`);
  console.error(`[daemon] data root ${config.dataDir}`);

  const heartbeat = setInterval(() => {
    bus.publish({ type: 'daemon.heartbeat', at: Date.now() });
  }, HEARTBEAT_MS);
  heartbeat.unref();

  let shuttingDown = false;
  const shutdown = (reason: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`[daemon] shutting down (${reason})`);
    clearInterval(heartbeat);
    server.close(() => {
      void removeRecord(config.recordPath).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 3_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.stdin.on('end', () => shutdown('parent exited'));
  process.stdin.resume();
}

main().catch((error: unknown) => {
  console.error('[daemon] fatal', error);
  process.exit(1);
});