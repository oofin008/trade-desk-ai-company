// Compile ADL specs -> runtime artifacts via a backend.
//
//   node compile.mjs           write the generated files
//   node compile.mjs --check   verify on-disk files match (exit 1 on drift)
//
// --check is what CI runs after validate.mjs: it proves the committed artifacts
// were generated from the specs and not hand-edited.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { loadSpecs, REPO_ROOT } from './lib/adl.mjs';
import { render, name as backendName } from './backends/claude-code.mjs';

const check = process.argv.includes('--check');
const specs = loadSpecs();
if (specs.length === 0) {
  console.error('No specs found in adl/agents. Run `npm run migrate` first.');
  process.exit(1);
}

const artifacts = render(specs);
let drift = 0;
let written = 0;

for (const { path, contents } of artifacts) {
  const rel = relative(REPO_ROOT, path);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === contents) continue;

  if (check) {
    console.error(`  ✗ out of date: ${rel}`);
    drift++;
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
    console.log(`  ✓ wrote ${rel}`);
    written++;
  }
}

if (check) {
  if (drift > 0) {
    console.error(`\n${drift} artifact(s) differ from the ADL source. Run \`npm run compile\` and commit.`);
    process.exit(1);
  }
  console.log(`✓ all ${artifacts.length} artifact(s) match the ADL source (backend: ${backendName}).`);
} else {
  console.log(`\nCompiled ${specs.length} spec(s) → ${artifacts.length} artifact(s); ${written} changed (backend: ${backendName}).`);
}
