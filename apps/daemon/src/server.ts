import crypto from 'node:crypto';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { DaemonEvent, type EventEnvelope, type HealthResponse } from '@ps/contracts';
import type { DaemonConfig } from './config.js';
import type { EventBus } from './bus.js';

export interface ServerDeps {
  config: DaemonConfig;
  bus: EventBus;
  startedAt: number;
}

function tokenMatches(presented: string | undefined, expected: string): boolean {
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createApp(deps: ServerDeps) {
  const { config, bus } = deps;
  const app = new Hono();

  // to check if existing daemon is live or not
  app.get('/health', (c) => {
    const body: HealthResponse = {
      ok: true,
      pid: process.pid,
      dataDir: config.dataDir,
      uptimeMs: Date.now() - deps.startedAt,
    };
    return c.json(body);
  });

  app.use('*', async (c, next) => {
    const header = c.req.header('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!tokenMatches(bearer ?? c.req.query('token'), config.token)) {
      return c.json({ error: { code: 'unauthorized', message: 'bad or missing token' } }, 401);
    }
    await next();
  });

  app.get('/events', (c) => {
    const header = c.req.header('last-event-id') ?? c.req.query('lastEventId');
    const lastEventId = Number(header ?? 0);
    const resumeFrom = Number.isFinite(lastEventId) ? lastEventId : 0;

    return streamSSE(c, async (stream) => {
      const pending: EventEnvelope[] = [];
      let wake: (() => void) | null = null;

      const unsubscribe = bus.subscribe((envelope) => {
        pending.push(envelope);
        wake?.();
        wake = null;
      });
      stream.onAbort(() => {
        unsubscribe();
        wake?.();
        wake = null;
      });

      const send = (envelope: EventEnvelope) =>
        stream.writeSSE({
          id: String(envelope.seq),
          event: envelope.event.type,
          data: JSON.stringify(envelope),
        });

      try {
        for (const envelope of bus.since(resumeFrom)) await send(envelope);
        bus.publish({ type: 'daemon.hello', pid: process.pid });

        while (!stream.aborted && !stream.closed) {
          while (pending.length > 0) await send(pending.shift() as EventEnvelope);
          // Park until something is published or the stream dies.
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      } finally {
        unsubscribe();
      }
    });
  });

  // push an event onto the bus by hand, so the whole chain is
  // curl-testable before anything real publishes to it.
  if (config.dev) {
    app.post('/debug/publish', async (c) => {
      const parsed = DaemonEvent.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) {
        return c.json(
          {
            error: {
              code: 'bad_request',
              message: 'not a DaemonEvent',
              details: parsed.error.issues,
            },
          },
          400,
        );
      }
      return c.json(bus.publish(parsed.data));
    });
  }

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'no such route' } }, 404));

  return app;
}