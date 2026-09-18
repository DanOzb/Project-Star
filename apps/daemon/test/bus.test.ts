import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/bus.js';
import type { EventEnvelope } from '@ps/contracts';

describe('event bus', () => {
  it('fans out and increments seq', () => {
    const bus = new EventBus();
    const seen: EventEnvelope[] = [];
    const unsubscribe = bus.subscribe((envelope) => seen.push(envelope));

    bus.publish({ type: 'daemon.heartbeat', at: 1 });
    bus.publish({ type: 'daemon.heartbeat', at: 2 });
    unsubscribe();
    bus.publish({ type: 'daemon.heartbeat', at: 3 });

    expect(seen).toHaveLength(2);
    expect(seen[0]?.seq).toBe(1);
    expect(bus.lastSeq).toBe(3);
  });

  it('survives a throwing subscriber', () => {
    const bus = new EventBus();
    bus.subscribe(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    bus.subscribe(good);

    expect(() => bus.publish({ type: 'daemon.heartbeat', at: 1 })).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('bounds the replay buffer', () => {
    const bus = new EventBus(2);
    for (let at = 1; at <= 5; at++) bus.publish({ type: 'daemon.heartbeat', at });
    expect(bus.since(0).map((envelope) => envelope.seq)).toEqual([4, 5]);
  });
});