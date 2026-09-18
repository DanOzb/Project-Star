import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export interface DaemonConfig {
  dataDir: string;
  recordPath: string;
  host: string;
  port: number;
  token: string;
  dev: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DaemonConfig {
  const dataDir = env['PS_DATA_DIR'] ?? path.join(os.homedir(), '.project-star');

  return {
    dataDir,
    recordPath: path.join(dataDir, 'daemon.json'),
    host: env['PS_HOST'] ?? '127.0.0.1',
    port: env['PS_PORT'] ? Number(env['PS_PORT']) : 0,
    token: env['PS_TOKEN'] ?? crypto.randomBytes(24).toString('base64url'),
    dev: env['NODE_ENV'] !== 'production',
  };
}