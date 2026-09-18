/**
 * Run with: pnpm smoke
 * 
 * Simple smoke test
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'project-star-smoke-'));
const recordPath = path.join(dataDir, 'daemon.json');
const children = new Set();

let failed = false;
const ok = (message) => console.log(`✓ ${message}`);
const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
  for (const child of children) child.kill('SIGKILL');
  process.exit(1);
};

function start() {
  const child = spawn('pnpm', ['--silent', '--filter', '@ps/daemon', 'start'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env, PS_DATA_DIR: dataDir },
  });
  children.add(child);
  child.once('exit', () => children.delete(child));

  const lines = createInterface({ input: child.stdout });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no ready line within 20s')), 20_000);
    lines.once('line', (line) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error(`first stdout line was not JSON: ${line}`));
      }
    });
  });

  return { child, ready };
}

const exited = (child) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), 5_000);
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

// ─── the first daemon ────────────────────────────────────────────────────────

const first = start();
const ready = await first.ready.catch((error) => fail(error.message));
if (ready.type !== 'daemon-ready') fail(`unexpected ready line: ${JSON.stringify(ready)}`);
const base = `http://${ready.host}:${ready.port}`;
ok(`ready line on stdout: port ${ready.port}, pid ${ready.pid}`);

const health = await (await fetch(`${base}/health`)).json();
if (!health.ok) fail('health check failed');
if (health.dataDir !== dataDir) fail('health reports the wrong data root');
ok('/health answers without a token and names the right data root');

if ((await fetch(`${base}/events`)).status !== 401) fail('/events served without a token');
ok('/events rejects an unauthenticated client');

// ─── the record on disk ──────────────────────────────────────────────────────

if (!existsSync(recordPath)) fail('daemon.json was not written');
const record = JSON.parse(readFileSync(recordPath, 'utf8'));
if (record.port !== ready.port || record.pid !== ready.pid) {
  fail('daemon.json disagrees with the ready line');
}
// The file carries the session token, so it must not be world-readable.
if (process.platform !== 'win32') {
  const mode = statSync(recordPath).mode & 0o777;
  if (mode !== 0o600) fail(`daemon.json is mode ${mode.toString(8)}, expected 600`);
  ok('daemon.json matches the ready line, mode 600');
} else {
  ok('daemon.json matches the ready line');
}

// ─── the stream ──────────────────────────────────────────────────────────────

const stream = await fetch(`${base}/events`, {
  headers: { authorization: `Bearer ${ready.token}` },
});
const reader = stream.body.getReader();
const decoder = new TextDecoder();
let seen = '';
const readUntil = async (needle, label) => {
  const deadline = Date.now() + 5_000;
  while (!seen.includes(needle) && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    seen += decoder.decode(value, { stream: true });
  }
  if (!seen.includes(needle)) fail(`never saw ${label}`);
  ok(label);
};

await readUntil('daemon.hello', 'SSE handshake');

await fetch(`${base}/debug/publish`, {
  method: 'POST',
  headers: { authorization: `Bearer ${ready.token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'daemon.heartbeat', at: 4242 }),
});
await readUntil('4242', 'published event arrives on the stream');
await reader.cancel();

// ─── a second daemon on the same data root ───────────────────────────────────

const second = start();
const deferred = await second.ready.catch((error) => fail(error.message));
if (deferred.port !== ready.port || deferred.pid !== ready.pid) {
  fail('second daemon did not defer to the first');
}
if ((await exited(second.child)) !== 0) fail('second daemon did not exit 0 after deferring');
ok('a second daemon reports the incumbent and exits 0');

// ─── parent death ────────────────────────────────────────────────────────────

first.child.stdin.end();
if ((await exited(first.child)) === 'timeout') fail('daemon outlived its parent');
ok('daemon exits when its parent closes stdin');

if (existsSync(recordPath)) fail('daemon.json survived a clean shutdown');
ok('daemon.json removed on clean exit');

// ─── a stale record ──────────────────────────────────────────────────────────

writeFileSync(
  recordPath,
  JSON.stringify({ ...record, pid: 1 }, null, 2),
  { mode: 0o600 },
);

const third = start();
const takeover = await third.ready.catch((error) => fail(error.message));
if (takeover.pid === 1) fail('daemon trusted a stale record');
ok('a stale daemon.json is detected and taken over');

third.child.stdin.end();
await exited(third.child);

console.log(`\nall good${failed ? '' : ' — Step 1 is done'}`);