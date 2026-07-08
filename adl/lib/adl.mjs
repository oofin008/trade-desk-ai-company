// Shared ADL helpers: locate the repo, load & parse agent specs, split runtime
// agent files into frontmatter + body. Kept dependency-light and pure so both
// the migrator and the compiler read the world the same way.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export const ADL_DIR = dirname(dirname(fileURLToPath(import.meta.url))); // .../adl
export const REPO_ROOT = dirname(ADL_DIR);
export const AGENTS_DIR = join(ADL_DIR, 'agents');
export const PROMPTS_DIR = join(ADL_DIR, 'prompts');

// Logical model tier -> concrete id. Owned by the Claude Code backend, but kept
// here so validate.mjs and the backend agree. Change ids in one place.
export const MODEL_IDS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'sonnet',
  opus: 'claude-opus-4-8',
  fable: 'claude-fable-5'
};

// The runtime agent file (.claude/agents/<name>.md) is frontmatter + body.
// Returns { frontmatter: <raw yaml text>, meta: <parsed>, body: <raw incl. leading sep> }.
export function splitAgentFile(text) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error('file has no YAML frontmatter block');
  return { frontmatter: m[1], meta: parseYaml(m[1]), body: m[2] };
}

export function loadSpecs() {
  if (!existsSync(AGENTS_DIR)) return [];
  return readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.adl.yaml'))
    .sort()
    .map((file) => {
      const path = join(AGENTS_DIR, file);
      const spec = parseYaml(readFileSync(path, 'utf8'));
      return { file, path, spec };
    });
}

export function readPromptBody(spec) {
  return readFileSync(resolve(ADL_DIR, spec.prompt.body), 'utf8');
}
