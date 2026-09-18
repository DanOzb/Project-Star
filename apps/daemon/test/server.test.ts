import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server.js';
import { EventBus } from '../src/bus.js';
import { loadConfig } from '../src/config.js';

const TOKEN = 'test-token-0123456789';

let app: ReturnType<typeof createApp>;
let bus: EventBus;

function readerFor(res: Response): ReadableStreamDefaultReader<Uint8Array> {
  if (!res.body) throw new Error('response had no body');
  // Node's ReadableStream is generic with `any` as its default; SSE is bytes.
  return (res.body as ReadableStream<Uint8Array>).getReader();
}

beforeEach(() => {
  const config = loadConfig({ PS_TOKEN: TOKEN, PS_DATA_DIR: '/tmp/project-star-test' });
  bus = new EventBus();
  app = createApp({ config, bus, startedAt: Date.now() });
});

describe('daemon http', () => {
  it('serves health without a token', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    expect((await app.request('/events')).status).toBe(401);
  });

  it('rejects a wrong token of the same length', async () => {
    const res = await app.request('/events', {
      headers: { authorization: `Bearer ${'x'.repeat(TOKEN.length)}` },
    });
    expect(res.status).toBe(401);
  });

  it('accepts the token as a query param, for EventSource', async () => {
    const res = await app.request(`/debug/publish?token=${TOKEN}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'daemon.heartbeat', at: Date.now() }),
    });
    expect(res.status).toBe(200);
  });

  it('rejects a publish that is not a DaemonEvent', async () => {
    const res = await app.request('/debug/publish', {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'nonsense' }),
    });
    expect(res.status).toBe(400);
  });

  it('streams hello, then live events', async () => {
    const res = await app.request('/events', {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = readerFor(res);
    const decoder = new TextDecoder();
    let seen = '';
    const readUntil = async (needle: string) => {
      const deadline = Date.now() + 5_000;
      while (!seen.includes(needle) && Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (done) break;
        seen += decoder.decode(value, { stream: true });
      }
      return seen.includes(needle);
    };

    expect(await readUntil('daemon.hello')).toBe(true);

    bus.publish({ type: 'daemon.heartbeat', at: 4242 });
    expect(await readUntil('4242')).toBe(true);

    await reader.cancel();
  });

  it('replays what a reconnecting client missed', async () => {
    bus.publish({ type: 'daemon.heartbeat', at: 1 });
    bus.publish({ type: 'daemon.heartbeat', at: 2 });

    const res = await app.request('/events', {
      headers: { authorization: `Bearer ${TOKEN}`, 'last-event-id': '1' },
    });
    const { value } = await readerFor(res).read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('"seq":2');
    expect(text).not.toContain('"seq":1');
  });
});