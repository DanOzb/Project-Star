import { z } from 'zod';

export const DaemonReadyLine = z.object({
  type: z.literal('daemon-ready'),
  host: z.string(),
  port: z.number().int().positive(),
  token: z.string().min(16),
  pid: z.number().int().positive(),
  dataDir: z.string(),
  startedAt: z.number().int(),
});
export type DaemonReadyLine = z.infer<typeof DaemonReadyLine>;

export const DaemonRecord = DaemonReadyLine;
export type DaemonRecord = z.infer<typeof DaemonRecord>;

export const HealthResponse = z.object({
  ok: z.literal(true),
  pid: z.number().int().positive(),
  dataDir: z.string(),
  uptimeMs: z.number().int().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;

export const ApiError = z.object({
  error: z.object({
    code: z.enum(['unauthorized', 'bad_request', 'not_found', 'internal']),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;