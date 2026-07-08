#!/usr/bin/env node
// Thin dispatcher so `adl <cmd>` works. Delegates to the individual scripts.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);

const SCRIPTS = {
  validate: 'validate.mjs',
  compile: 'compile.mjs',
  check: 'compile.mjs',
  migrate: 'migrate.mjs',
  build: null // validate then compile
};

if (!cmd || cmd === '-h' || cmd === '--help' || !(cmd in SCRIPTS)) {
  console.log('Usage: adl <validate|compile|check|migrate|build> [args]');
  process.exit(cmd && !(cmd in SCRIPTS) ? 1 : 0);
}

function run(script, args) {
  return spawnSync('node', [join(DIR, script), ...args], { stdio: 'inherit' }).status ?? 1;
}

let status;
if (cmd === 'build') {
  status = run('validate.mjs', []) || run('compile.mjs', []);
} else if (cmd === 'check') {
  status = run('compile.mjs', ['--check', ...rest]);
} else {
  status = run(SCRIPTS[cmd], rest);
}
process.exit(status);
