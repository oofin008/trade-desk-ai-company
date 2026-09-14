// Build a "resolved" MCP config for the `claude --print` subprocess.
//
// Why this exists: `claude --print` only loads MCP servers when passed
// `--mcp-config <file> --strict-mcp-config`. The repo-root `.mcp.json` keeps
// secrets out of git by using `${VAR}` placeholders — but Claude only
// interpolates those for a stdio server's `env` block, NOT for an http server's
// `headers` block (so `stitch`'s `X-Goog-Api-Key: ${STITCH_API_KEY}` would be
// sent literally → 401). We resolve every `${VAR}` from the runner's own env
// here, write the result to a private per-agent tmp file, and hand that to
// Claude. The committed `.mcp.json` is never modified.

import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';

const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

// Recursively walk any JSON value, replacing every `${NAME}` inside string
// values with `env[NAME]`. An unresolved `${NAME}` (env var missing/empty) is
// left as-is and reported via onUnresolved(name, path).
export function resolveMcpPlaceholders(value, env = process.env, onUnresolved = () => {}, path = '') {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER, (match, name) => {
      const resolved = env[name];
      if (resolved === undefined || resolved === '') {
        onUnresolved(name, path || '(root)');
        return match;
      }
      return resolved;
    });
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => resolveMcpPlaceholders(v, env, onUnresolved, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveMcpPlaceholders(v, env, onUnresolved, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return value;
}

// Read <repoRoot>/.mcp.json, resolve its `${VAR}` placeholders from `env`, and
// write the result to a private per-agent file in the OS temp dir (mode 0600,
// overwritten each call). Returns the written path, or null when there is no
// `.mcp.json` / it is unparseable (→ caller keeps the current no-MCP behaviour).
export function buildResolvedMcpConfig(repoRoot, agentName, env = process.env, logger = console) {
  const srcPath = join(repoRoot, '.mcp.json');
  let raw;
  try {
    raw = readFileSync(srcPath, 'utf8');
  } catch {
    return null; // no .mcp.json → no MCP, same as before
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    logger.warn(`[mcp] ${srcPath} is not valid JSON (${e.message}) — MCP config skipped`);
    return null;
  }
  const resolved = resolveMcpPlaceholders(parsed, env, (name, path) => {
    const server = /(?:^|\.)mcpServers\.([^.[]+)/.exec(path)?.[1] || path;
    logger.warn(`[mcp] unresolved \${${name}} in .mcp.json (server: ${server}, at ${path}) — env var not set; leaving placeholder`);
  });
  // Namespaced by the company directory's own name so several AI companies
  // running on the same machine never collide on one another's resolved
  // config (the same reason pm2 process names are namespaced — see
  // ecosystem.config.cjs). Sanitized to keep the filename portable.
  const ns = basename(repoRoot).replace(/[^\w.-]+/g, '-') || 'ai-company';
  const outPath = join(tmpdir(), `${ns}-agent-mcp-${agentName}.json`);
  writeFileSync(outPath, `${JSON.stringify(resolved, null, 2)}\n`, { mode: 0o600 });
  // writeFileSync's mode is only applied when the file is created; force it in
  // case the file already existed from a previous startup with looser perms.
  try { chmodSync(outPath, 0o600); } catch {}
  return outPath;
}
