// Claude Code compiler backend: turns ADL specs into the concrete artifacts
// Claude Code + the Discord runner read. This is the ONLY place the ADL source
// is coupled to Claude Code — swap/add a backend to target another runtime.
//
// Emits:
//   .claude/agents/<name>.md          (frontmatter + prompt body)
//   scripts/discord-agents/roster.json (bot processes)
//
// ecosystem.config.cjs is intentionally NOT generated: it already derives its
// process list from roster.json at load time.
import { join } from 'node:path';
import { REPO_ROOT, readPromptBody } from '../lib/adl.mjs';

const GENERATED_BANNER = null; // agent .md files carry no banner: kept byte-for-byte editable via ADL.

// Deterministic frontmatter so regeneration is byte-stable. Field order and
// formatting match the hand-written originals exactly.
function agentMarkdown({ spec }) {
  const { metadata, runtime, capabilities } = spec;
  const fm = [
    `name: ${metadata.name}`,
    `description: ${metadata.description}`,
    `tools: ${capabilities.tools.join(', ')}`,
    `model: ${runtime.model}`
  ].join('\n');
  const body = readPromptBody(spec); // includes its own leading separator newline
  return `---\n${fm}\n---\n${body}`;
}

function rosterJson(specs) {
  const bots = specs
    .map((s) => s.spec)
    .filter((s) => s.runtime.surface === 'bot')
    .map((s) => {
      const entry = { name: s.metadata.name, tokenEnv: s.runtime.tokenEnv, model: s.runtime.model };
      if (s.runtime.default) entry.default = true;
      return entry;
    });
  return JSON.stringify(bots, null, 2) + '\n';
}

// Returns [{ path, contents }] — the compiler diffs or writes these.
export function render(specs) {
  const out = [];
  for (const s of specs) {
    out.push({
      path: join(REPO_ROOT, '.claude', 'agents', `${s.spec.metadata.name}.md`),
      contents: agentMarkdown(s)
    });
  }
  out.push({
    path: join(REPO_ROOT, 'scripts', 'discord-agents', 'roster.json'),
    contents: rosterJson(specs)
  });
  return out;
}

export const name = 'claude-code';
