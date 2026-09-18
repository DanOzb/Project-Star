import type { DaemonEvent, EventEnvelope } from '@ps/contracts';

type Listener = (envelope: EventEnvelope) => void;

export class EventBus {
  #seq = 0;
  #listeners = new Set<Listener>();
  #buffer: EventEnvelope[] = [];

  constructor(private readonly bufferSize = 256) {}

  publish(event: DaemonEvent): EventEnvelope {
    const envelope: EventEnvelope = { seq: ++this.#seq, at: Date.now(), event };

    this.#buffer.push(envelope);
    if (this.#buffer.length > this.bufferSize) this.#buffer.shift();

    for (const listener of this.#listeners) {
      try {
        listener(envelope);
      } catch {
        // A broken subscriber must not take down the publisher.
      }
    }
    return envelope;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  since(seq: number): EventEnvelope[] {
    return this.#buffer.filter((envelope) => envelope.seq > seq);
  }

  get lastSeq(): number {
    return this.#seq;
  }
}