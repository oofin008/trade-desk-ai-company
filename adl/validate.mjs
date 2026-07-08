// Validate every ADL agent spec: JSON Schema for structure, then cross-reference
// linting for the things a schema can't express (uniqueness, mention targets
// resolve, bot/token invariants, prompt files exist, one default bot).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { loadSpecs, ADL_DIR } from './lib/adl.mjs';

const schema = JSON.parse(readFileSync(resolve(ADL_DIR, 'schema/agent.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

const specs = loadSpecs();
const errors = [];
const err = (name, msg) => errors.push(`  ✗ ${name}: ${msg}`);

if (specs.length === 0) errors.push('  ✗ no specs found in adl/agents');

const names = new Set();
const bots = [];

for (const { file, spec } of specs) {
  const name = spec?.metadata?.name ?? file;

  if (!validateSchema(spec)) {
    for (const e of validateSchema.errors) err(name, `schema${e.instancePath} ${e.message}`);
    continue; // structural errors first; skip semantic checks on a broken spec
  }

  // filename must match declared name
  if (basename(file, '.adl.yaml') !== spec.metadata.name) {
    err(name, `filename "${file}" does not match metadata.name "${spec.metadata.name}"`);
  }

  // unique names
  if (names.has(spec.metadata.name)) err(name, 'duplicate metadata.name');
  names.add(spec.metadata.name);

  // bot / subagent token invariants
  const isBot = spec.runtime.surface === 'bot';
  if (isBot && !spec.runtime.tokenEnv) err(name, 'surface=bot requires runtime.tokenEnv');
  if (!isBot && spec.runtime.tokenEnv) err(name, 'surface=subagent must not set runtime.tokenEnv');
  if (!isBot && spec.runtime.default) err(name, 'surface=subagent cannot be default');
  if (isBot) bots.push(spec);

  // tier <-> surface coherence
  if ((spec.metadata.tier === 'specialist') === isBot) {
    err(name, `tier "${spec.metadata.tier}" is inconsistent with surface "${spec.runtime.surface}"`);
  }

  // prompt body must exist
  if (!existsSync(resolve(ADL_DIR, spec.prompt.body))) {
    err(name, `prompt.body not found: ${spec.prompt.body}`);
  }
}

// mention targets must resolve to known agents (deferred until all names known)
for (const { spec } of specs) {
  for (const target of spec.interaction?.canMention ?? []) {
    if (!names.has(target)) err(spec.metadata.name, `canMention references unknown agent "${target}"`);
    if (target === spec.metadata.name) err(spec.metadata.name, 'cannot mention itself');
  }
}

// exactly one default bot
const defaults = bots.filter((b) => b.runtime.default);
if (bots.length && defaults.length !== 1) {
  errors.push(`  ✗ expected exactly one default bot, found ${defaults.length}`);
}

if (errors.length) {
  console.error(`ADL validation failed (${errors.length} error(s)):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`✓ ${specs.length} spec(s) valid — ${bots.length} bot(s), ${specs.length - bots.length} subagent(s).`);
