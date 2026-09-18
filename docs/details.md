# Details
 
**What this file is:** the current state of the project — versions, commands,
paths, settings. Always true right now.
 
---
 
## Toolchain
 
| Thing | Version | Pinned in |
| --- | --- | --- |
| Node | 24.18.0 | `.node-version`, `engines` |
| pnpm | 10.34.5 | `packageManager` |
| TypeScript | `~6.0.0` | root `devDependencies` |
| Dev runtime | tsx | root `devDependencies` |
| Tests | Vitest | root `devDependencies` |
| Lint | ESLint, type-aware rules | `eslint.config.js` |
| Format | Prettier | `.prettierrc.json` |
| HTTP | Hono + `@hono/node-server` | `@ps/daemon` |
| Validation | zod | `@ps/contracts`, `@ps/daemon` |
 
### The TypeScript pin 
 
No release of `typescript-eslint` supports TypeScript 7 yet. Bump to 7 once support is added. 
 
---
 
## Commands
 
| Command | Does |
| --- | --- |
| `pnpm daemon` | `tsx watch` the daemon; prints its ready line, logs to stderr |
| `pnpm test` | Vitest, headless, no browser or Electron |
| `pnpm test:watch` | the same in watch mode |
| `pnpm typecheck` | one `tsc --noEmit` over the whole workspace |
| `pnpm lint` / `lint:fix` | ESLint |
| `pnpm format` / `format:check` | Prettier |
| `pnpm smoke` | spawns the daemon as a child process and exercises the full chain |
 
Poking at a running daemon by hand — port and token come from the ready line or
from `daemon.json`:
 
```bash
curl -s localhost:$PORT/health | jq
curl -N -H "Authorization: Bearer $TOKEN" localhost:$PORT/events &
curl -s -X POST localhost:$PORT/debug/publish \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"type":"daemon.heartbeat","at":1}'
```
 
`/debug/publish` exists only when `NODE_ENV !== 'production'`.
 
---
 
## Environment variables
 
| Variable | Default | Notes |
| --- | --- | --- |
| `PS_DATA_DIR` | `~/.project-star` | instance identity — see DEC-0006 |
| `PS_HOST` | `127.0.0.1` | loopback; changing it needs an auth review |
| `PS_PORT` | `0` | 0 asks the OS for a free port |
| `PS_TOKEN` | random per spawn | override only for tests |
| `NODE_ENV` | unset | `production` removes `/debug/publish` |
 
---
 
## Paths
 
| Path | Contents |
| --- | --- |
| `~/.project-star/` | data root: all app state |
| `~/.project-star/daemon.json` | discovery record, mode 0600, carries the session token |
 
SQLite lands in the data root at Step 5. Scaffolded project files do **not** live
here — that location is still undecided.
 
---