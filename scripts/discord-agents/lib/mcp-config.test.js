import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';

import { resolveMcpPlaceholders, buildResolvedMcpConfig } from './mcp-config.js';

test('resolveMcpPlaceholders: replaces ${VAR} in nested strings from env', () => {
  const input = {
    mcpServers: {
      github: { env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GH}' } },
      stitch: { headers: { 'X-Goog-Api-Key': '${STITCH}' }, url: 'https://x/mcp' }
    }
  };
  const out = resolveMcpPlaceholders(input, { GH: 'ghtok', STITCH: 'sk-123' });
  assert.equal(out.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN, 'ghtok');
  assert.equal(out.mcpServers.stitch.headers['X-Goog-Api-Key'], 'sk-123');
  assert.equal(out.mcpServers.stitch.url, 'https://x/mcp');
});

test('resolveMcpPlaceholders: walks arrays', () => {
  const out = resolveMcpPlaceholders({ args: ['-y', '${PKG}'] }, { PKG: 'server-github' });
  assert.deepEqual(out.args, ['-y', 'server-github']);
});

test('resolveMcpPlaceholders: leaves unresolved ${VAR} as-is and reports it', () => {
  const missing = [];
  const out = resolveMcpPlaceholders(
    { mcpServers: { stitch: { headers: { 'X-Goog-Api-Key': '${STITCH_API_KEY}' } } } },
    {},
    (name, path) => missing.push({ name, path })
  );
  assert.equal(out.mcpServers.stitch.headers['X-Goog-Api-Key'], '${STITCH_API_KEY}');
  assert.equal(missing.length, 1);
  assert.equal(missing[0].name, 'STITCH_API_KEY');
  assert.match(missing[0].path, /stitch/);
});

test('resolveMcpPlaceholders: empty-string env var counts as unresolved', () => {
  const missing = [];
  const out = resolveMcpPlaceholders('${X}', { X: '' }, (n) => missing.push(n));
  assert.equal(out, '${X}');
  assert.deepEqual(missing, ['X']);
});

test('resolveMcpPlaceholders: non-string primitives pass through', () => {
  assert.equal(resolveMcpPlaceholders(42), 42);
  assert.equal(resolveMcpPlaceholders(true), true);
  assert.equal(resolveMcpPlaceholders(null), null);
});

test('buildResolvedMcpConfig: returns null when .mcp.json is absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
  try {
    assert.equal(buildResolvedMcpConfig(dir, 'some-agent', {}), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildResolvedMcpConfig: writes a resolved 0600 file and returns its path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
  const agent = `unit-${process.pid}`;
  try {
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify({
      mcpServers: {
        stitch: { type: 'http', url: 'https://s/mcp', headers: { 'X-Goog-Api-Key': '${STITCH_API_KEY}' } }
      }
    }));
    const warnings = [];
    const out = buildResolvedMcpConfig(dir, agent, { STITCH_API_KEY: 'resolved-secret' }, { warn: (m) => warnings.push(m) });
    // Namespaced by the project directory's basename (mkdtemp'd above), so
    // parallel companies on one machine don't share a resolved-config path.
    assert.ok(out.endsWith(`${basename(dir)}-agent-mcp-${agent}.json`));
    const written = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(written.mcpServers.stitch.headers['X-Goog-Api-Key'], 'resolved-secret');
    assert.equal(warnings.length, 0);
    assert.equal(statSync(out).mode & 0o777, 0o600);
    rmSync(out, { force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildResolvedMcpConfig: warns (server name) on a missing env var but still writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
  const agent = `unit-miss-${process.pid}`;
  try {
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify({
      mcpServers: { stitch: { headers: { 'X-Goog-Api-Key': '${STITCH_API_KEY}' } } }
    }));
    const warnings = [];
    const out = buildResolvedMcpConfig(dir, agent, {}, { warn: (m) => warnings.push(m) });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /STITCH_API_KEY/);
    assert.match(warnings[0], /stitch/);
    const written = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(written.mcpServers.stitch.headers['X-Goog-Api-Key'], '${STITCH_API_KEY}');
    rmSync(out, { force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildResolvedMcpConfig: returns null on invalid JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
  try {
    writeFileSync(join(dir, '.mcp.json'), '{ not valid json');
    const warnings = [];
    assert.equal(buildResolvedMcpConfig(dir, 'a', {}, { warn: (m) => warnings.push(m) }), null);
    assert.equal(warnings.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
