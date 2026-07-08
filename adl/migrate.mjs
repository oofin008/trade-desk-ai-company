// One-time migration: reverse-engineer the existing hand-written
// .claude/agents/*.md files into ADL source (adl/agents/*.adl.yaml +
// adl/prompts/*.md). Enrichment metadata (department, tier, surface, mention
// contracts) that the flat frontmatter can't express is supplied below.
//
// After this runs, ADL is the source of truth and compile.mjs regenerates the
// .claude/agents files. Re-running migrate is safe but normally unnecessary.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as toYaml } from 'yaml';
import { REPO_ROOT, AGENTS_DIR, PROMPTS_DIR, splitAgentFile } from './lib/adl.mjs';

const CLAUDE_AGENTS = join(REPO_ROOT, '.claude', 'agents');

// name -> fields not derivable from the flat frontmatter.
const ENRICH = {
  ceo: { department: 'company', tier: 'ceo', surface: 'bot', tokenEnv: 'DISCORD_TOKEN_CEO', default: true,
    canMention: ['head-of-product', 'head-of-software', 'head-of-marketing', 'head-of-sales'] },
  'head-of-product': { department: 'product', tier: 'head', surface: 'bot', tokenEnv: 'DISCORD_TOKEN_PRODUCT',
    canMention: ['head-of-software', 'head-of-marketing', 'head-of-sales', 'ceo'] },
  'head-of-software': { department: 'software', tier: 'head', surface: 'bot', tokenEnv: 'DISCORD_TOKEN_SOFTWARE',
    canMention: ['head-of-product', 'ceo'] },
  'head-of-marketing': { department: 'marketing', tier: 'head', surface: 'bot', tokenEnv: 'DISCORD_TOKEN_MARKETING',
    canMention: ['head-of-sales', 'head-of-product', 'ceo'] },
  'head-of-sales': { department: 'sales', tier: 'head', surface: 'bot', tokenEnv: 'DISCORD_TOKEN_SALES',
    canMention: ['head-of-marketing', 'head-of-product', 'ceo'] },
  dev: { department: 'software', tier: 'specialist', surface: 'subagent' },
  qa: { department: 'software', tier: 'specialist', surface: 'subagent' },
  researcher: { department: 'product', tier: 'specialist', surface: 'subagent' },
  analyst: { department: 'product', tier: 'specialist', surface: 'subagent' },
  copywriter: { department: 'marketing', tier: 'specialist', surface: 'subagent' },
  designer: { department: 'marketing', tier: 'specialist', surface: 'subagent' },
  sdr: { department: 'sales', tier: 'specialist', surface: 'subagent' },
  ae: { department: 'sales', tier: 'specialist', surface: 'subagent' },
  init: { department: 'company', tier: 'specialist', surface: 'subagent' }
};

function toolList(raw) {
  return String(raw).split(',').map((t) => t.trim()).filter(Boolean);
}

function buildSpec(meta, e) {
  const runtime = { model: meta.model, surface: e.surface };
  if (e.surface === 'bot') {
    runtime.tokenEnv = e.tokenEnv;
    if (e.default) runtime.default = true;
  }
  const spec = {
    apiVersion: 'adl/v1',
    kind: 'Agent',
    metadata: {
      name: meta.name,
      department: e.department,
      tier: e.tier,
      description: meta.description
    },
    runtime,
    capabilities: { tools: toolList(meta.tools) }
  };
  if (e.canMention) {
    spec.interaction = { canMention: e.canMention, handoffVia: 'github-issue' };
  }
  spec.guardrails = { draftsOnly: true, inherits: ['company-hard-rules'] };
  spec.prompt = { body: `prompts/${meta.name}.md` };
  return spec;
}

mkdirSync(AGENTS_DIR, { recursive: true });
mkdirSync(PROMPTS_DIR, { recursive: true });

const { readdirSync } = await import('node:fs');
const files = readdirSync(CLAUDE_AGENTS).filter((f) => f.endsWith('.md')).sort();
let count = 0;
for (const file of files) {
  const name = file.replace(/\.md$/, '');
  const e = ENRICH[name];
  if (!e) {
    console.error(`  ✗ no enrichment mapping for "${name}" — add it to migrate.mjs`);
    process.exitCode = 1;
    continue;
  }
  const { meta, body } = splitAgentFile(readFileSync(join(CLAUDE_AGENTS, file), 'utf8'));
  const spec = buildSpec(meta, e);

  writeFileSync(join(AGENTS_DIR, `${name}.adl.yaml`), toYaml(spec, { lineWidth: 0 }));
  writeFileSync(join(PROMPTS_DIR, `${name}.md`), body);
  count++;
  console.log(`  ✓ ${name}`);
}
console.log(`\nMigrated ${count} agent(s) → adl/agents + adl/prompts`);
