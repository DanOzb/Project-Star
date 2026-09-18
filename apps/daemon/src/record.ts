import fs from 'node:fs/promises';
import path from 'node:path';
import { DaemonRecord } from '@ps/contracts';

export async function readRecord(recordPath: string): Promise<DaemonRecord | null> {
  try {
    const raw = await fs.readFile(recordPath, 'utf8');
    const parsed = DaemonRecord.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function claimRecord(
  recordPath: string,
  record: DaemonRecord,
): Promise<'claimed' | 'taken'> {
  await fs.mkdir(path.dirname(recordPath), { recursive: true });
  try {
    await fs.writeFile(recordPath, JSON.stringify(record, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    return 'claimed';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return 'taken';
    throw error;
  }
}

export async function removeRecord(recordPath: string): Promise<void> {
  await fs.rm(recordPath, { force: true });
}


export async function isAlive(record: DaemonRecord): Promise<boolean> {
  try {
    process.kill(record.pid, 0);
  } catch {
    return false;
  }

  try {
    const response = await fetch(`http://${record.host}:${record.port}/health`, {
      signal: AbortSignal.timeout(500),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { dataDir?: string };
    return body.dataDir === record.dataDir;
  } catch {
    return false;
  }
}