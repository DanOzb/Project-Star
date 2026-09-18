import { z } from 'zod';

export const DaemonEvent = z.discriminatedUnion('type', 
[
  z.object({
    type: z.literal('daemon.hello'),
    pid: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('daemon.heartbeat'),
    at: z.number().int(),
  }),
]);
export type DaemonEvent = z.infer<typeof DaemonEvent>;

export const EventEnvelope = z.object({
  seq: z.number().int().positive(),
  at: z.number().int(),
  event: DaemonEvent,
});
export type EventEnvelope = z.infer<typeof EventEnvelope>;