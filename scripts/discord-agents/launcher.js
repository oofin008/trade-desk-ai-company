// Dev launcher: spawn one agent-runner process per roster entry in this
// terminal. Good for local testing. For real persistence use pm2 with
// ecosystem.config.cjs (auto-restart, logs, survives reboot).

import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoster } from './lib/mentions.js';
import { loadEnvFile } from './lib/chunk.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(here, '..', '..', '.env'));

const roster = loadRoster(here);
const children = [];

for (const entry of roster) {
  const child = spawn(process.execPath, [join(here, 'agent-runner.js')], {
    stdio: 'inherit',
    env: { ...process.env, AGENT_NAME: entry.name }
  });
  children.push(child);
  child.on('exit', (code) => console.error(`[launcher] ${entry.name} exited (${code})`));
}

console.log(`[launcher] started ${children.length} agents: ${roster.map((r) => r.name).join(', ')}`);

const shutdown = () => { for (const c of children) { try { c.kill('SIGTERM'); } catch {} } process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
