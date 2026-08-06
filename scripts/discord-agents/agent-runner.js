// Per-agent Discord process.
//
// One of these runs for each entry in roster.json. It connects to Discord as
// that agent's own bot, listens for messages that address it, and answers by
// running `claude --print --agent <name>` against the company repo. Because
// every agent is a real bot in the same channel, an agent simply mentioning a
// peer (@head-of-software) becomes a real ping that the peer's process receives
// — Discord itself is the message bus. No central router.
//
// Cost discipline (the founder's hard requirement) lives here:
//   - an agent spends tokens ONLY when actually addressed (idle = free)
//   - each turn is a fresh, scoped invocation (no growing --continue context);
//     durable memory lives in GitHub issues + company/ files
//   - per-agent --model tier (sonnet by default), hop budget, concurrency cap,
//     and a spend ledger that reminds (not freezes) at the configured limits
//
// Run one directly:
//   AGENT_NAME=ceo DISCORD_TOKEN_CEO=... DISCORD_CHANNEL_ID=... \
//   ALLOWED_USER_IDS=... AI_STARTUP_DIR=/abs/path node agent-runner.js
// Or run the whole roster via launcher.js.

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chunkMessage, loadEnvFile } from './lib/chunk.js';
import { makeStore } from './lib/state.js';
import {
  loadRoster, makeIdStore, rewriteOutgoing, humanizeMentions,
  nameForId, addressesName, mentionsAnyAgent
} from './lib/mentions.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(here, '..', '..', '.env'));

const {
  AGENT_NAME,
  DISCORD_CHANNEL_ID,
  AI_STARTUP_DIR,
  ALLOWED_USER_IDS = '',
  CLAUDE_CMD = 'claude',
  HOP_BUDGET = '30',
  MAX_CONCURRENCY = '2',
  CLAUDE_TIMEOUT_MINUTES = '30',
  SESSION_USD_LIMIT = '5',
  DAILY_USD_LIMIT = '20'
} = process.env;

if (!AGENT_NAME || !DISCORD_CHANNEL_ID || !AI_STARTUP_DIR) {
  console.error('Missing required env. Set AGENT_NAME, DISCORD_CHANNEL_ID, AI_STARTUP_DIR.');
  process.exit(1);
}

const projectDir = resolve(AI_STARTUP_DIR);
const stateDir = join(projectDir, '.discord-agents');
const roster = loadRoster(here);
const me = roster.find((r) => r.name === AGENT_NAME);
if (!me) {
  console.error(`AGENT_NAME "${AGENT_NAME}" not found in roster.json.`);
  process.exit(1);
}
const isPrimary = !!me.default;
const model = me.model || 'sonnet';
const token = process.env[me.tokenEnv] || process.env.DISCORD_TOKEN;
if (!token) {
  console.error(`No bot token. Set ${me.tokenEnv} (or DISCORD_TOKEN) for ${AGENT_NAME}.`);
  process.exit(1);
}

const hopBudget = Math.max(1, parseInt(HOP_BUDGET, 10));
const maxConcurrency = Math.max(1, parseInt(MAX_CONCURRENCY, 10));
const timeoutMs = Math.max(1, parseFloat(CLAUDE_TIMEOUT_MINUTES)) * 60 * 1000;
const spendLimits = {
  sessionLimit: parseFloat(SESSION_USD_LIMIT) || 0,
  dailyLimit: parseFloat(DAILY_USD_LIMIT) || 0
};
const allowedUsers = new Set(ALLOWED_USER_IDS.split(',').map((s) => s.trim()).filter(Boolean));
const allAgentNames = roster.map((r) => r.name);
const peerNames = allAgentNames.filter((n) => n !== AGENT_NAME);
// LOG_AGENT_STEPS=1 streams each turn's thinking/tool steps to stdout (verbose,
// uses --output-format stream-json). Off by default = quiet, cheaper to read.
const logSteps = /^(1|true|yes)$/i.test(process.env.LOG_AGENT_STEPS || '');
// AGENT_MEMORY=session (default) keeps a per-agent resumable Claude session so
// the agent remembers prior turns; AGENT_MEMORY=off = stateless (cheapest).
// Memory grows the context each turn — use /reset to wipe it.
const useSession = (process.env.AGENT_MEMORY || 'session').toLowerCase() !== 'off';

const store = makeStore(stateDir);
const idStore = makeIdStore(stateDir);

// Per-agent Claude session ids (name -> sessionId), shared file so /reset can
// wipe everyone's memory at once. We resume our own id each turn.
const sessionsPath = join(stateDir, 'sessions.json');
const readSessions = () => { try { return JSON.parse(readFileSync(sessionsPath, 'utf8')); } catch { return {}; } };
const loadSessionId = () => (useSession ? readSessions()[AGENT_NAME] || null : null);
const saveSessionId = (id) => { const m = readSessions(); m[AGENT_NAME] = id; writeFileSync(sessionsPath, JSON.stringify(m, null, 2)); };
const clearAllSessions = () => { try { writeFileSync(sessionsPath, '{}'); } catch {} };

// Wipe downloaded Discord attachments (see saveAttachments). Cleared on /reset
// alongside sessions/ledger so a reset leaves no stale files on disk.
const attachmentsDir = join(stateDir, 'attachments');
const clearAttachments = () => { try { rmSync(attachmentsDir, { recursive: true, force: true }); } catch {} };

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

client.once('clientReady', () => {
  idStore.setOwn(AGENT_NAME, client.user.id);
  console.log(`[${AGENT_NAME}] online as ${client.user.tag} (${client.user.id}) — model=${model}, primary=${isPrimary}`);
  if (allowedUsers.size === 0) {
    console.warn(`[${AGENT_NAME}] ⚠️  ALLOWED_USER_IDS not set — anyone in the channel can drive this agent.`);
  }
});

// Connection lifecycle. Without these, a sleep/network-drop that discord.js
// can't RESUME leaves a silent zombie: the process stays alive but
// disconnected, so pm2 never restarts it (it looks healthy). We log the
// transitions and, on a non-resumable session, exit so pm2 replaces us with a
// fresh process. discord.js auto-reconnects on transient drops on its own.
client.on('error', (e) => console.error(`[${AGENT_NAME}] client error`, e?.message || e));
client.on('shardError', (e) => console.error(`[${AGENT_NAME}] shard error`, e?.message || e));
client.on('shardDisconnect', (ev, id) => console.warn(`[${AGENT_NAME}] shard ${id} disconnected (code ${ev?.code}) — attempting reconnect`));
client.on('shardReconnecting', (id) => console.log(`[${AGENT_NAME}] shard ${id} reconnecting…`));
client.on('shardResume', (id) => console.log(`[${AGENT_NAME}] shard ${id} resumed`));

// Non-resumable session: discord.js destroys the client and does NOT relogin.
// Exit so pm2 starts a fresh process instead of leaving a silent zombie.
client.on('invalidated', () => {
  console.error(`[${AGENT_NAME}] session invalidated — exiting for pm2 restart`);
  process.exit(1);
});

process.on('unhandledRejection', (r) => console.error(`[${AGENT_NAME}] unhandledRejection`, r?.message || r));
// A stray network error (ECONNRESET / connect timeout during a reconnect) can
// surface as an uncaughtException. Exit cleanly so pm2 restarts a fresh process
// with a clear log line, rather than dumping a raw stack trace.
process.on('uncaughtException', (e) => {
  console.error(`[${AGENT_NAME}] uncaughtException — exiting for pm2 restart:`, e?.message || e);
  process.exit(1);
});

// In-process FIFO so this agent handles one message at a time.
const queue = [];
let working = false;
const seen = new Set(); // dedup message ids across reconnects

client.on('messageCreate', (message) => {
  if (message.channelId !== DISCORD_CHANNEL_ID) return;
  if (message.author.id === client.user?.id) return; // never react to self
  if (seen.has(message.id)) return;
  seen.add(message.id);
  if (seen.size > 500) seen.delete(seen.values().next().value);
  queue.push(message);
  pump();
});

async function pump() {
  if (working) return;
  working = true;
  try {
    while (queue.length) {
      const m = queue.shift();
      try { await handle(m); } catch (e) { console.error(`[${AGENT_NAME}]`, e); }
    }
  } finally {
    working = false;
  }
}

async function handle(message) {
  const fromHuman = !message.author.bot;
  const ids = idStore.load();

  // Founder-only channel commands. Only the primary bot acts/acks so we don't
  // get five replies; state is shared, so every agent sees the result.
  const cmd = message.content.trim().toLowerCase();
  if (fromHuman && allowedUsers.has(message.author.id) && cmd.startsWith('/')) {
    if (!isPrimary) return;
    if (cmd === '/freeze') { await store.setFrozen(true); return ack(message, '🧊 Frozen. Agents will stop responding. `/unfreeze` to resume.'); }
    if (cmd === '/unfreeze') { await store.setFrozen(false); return ack(message, '▶️ Unfrozen. Agents are live again.'); }
    if (cmd === '/reset') { await store.resetAll(); clearAllSessions(); clearAttachments(); return ack(message, '✅ Chain + spend ledger reset, all agents’ memory cleared, and downloaded attachments removed.'); }
    if (cmd === '/status') {
      const s = store.read();
      return ack(message, `📊 hops ${s.hops}/${hopBudget} · session $${s.ledger.sessionUsd.toFixed(2)}/${spendLimits.sessionLimit} · today $${s.ledger.dailyUsd.toFixed(2)}/${spendLimits.dailyLimit} · ${s.frozen ? '🧊 frozen' : 'live'}`);
    }
    return; // unknown command — ignore
  }

  // Ignore unauthorized humans entirely (no spend, no noise).
  if (fromHuman && allowedUsers.size > 0 && !allowedUsers.has(message.author.id)) return;

  // Is this message for me?
  const forMe =
    addressesName(message, AGENT_NAME, client.user.id, client.user.username) ||
    (isPrimary && fromHuman && !mentionsAnyAgent(message, ids, allAgentNames)); // founder default -> primary
  if (!forMe) return;

  // Global kill switch.
  if (store.read().frozen) {
    if (isPrimary) await safeReact(message, '🧊');
    return;
  }

  // Hop accounting. A founder message starts a fresh chain (free); a
  // bot-triggered turn consumes the auto-chaining budget.
  if (fromHuman) {
    await store.startChain(message.id);
  } else {
    const { ok, hops } = await store.registerHop(hopBudget);
    if (!ok) {
      if (isPrimary || addressesName(message, AGENT_NAME, client.user.id, client.user.username)) {
        await send(message.channel, `⏸️ Hop budget reached (${hops - 1}/${hopBudget}). Pausing — ${founderTag()} please review and re-direct.`);
      }
      return;
    }
  }

  await safeReact(message, '🔄');
  await store.acquireSlot(maxConcurrency);
  try {
    await runTurn(message, ids);
  } finally {
    await store.releaseSlot();
  }
}

async function runTurn(message, ids) {
  const fromName = message.author.bot ? (nameForId(message.author.id, ids) || 'another agent') : 'the founder';
  let body = humanizeMentions(message.content, ids)
    .replace(new RegExp(`@${AGENT_NAME}\\b`, 'gi'), '')
    .trim();

  // Discord attachments: download them to a Claude-readable path and tell the
  // agent to Read them (the CLI takes text on stdin, but its Read tool can open
  // files from disk — .md/.txt/PDF/images alike; projectDir is already --add-dir'd).
  const filePaths = await saveAttachments(message);
  if (filePaths.length) {
    body += `${body ? '\n\n' : ''}[The sender attached ${filePaths.length} file${filePaths.length > 1 ? 's' : ''}. Use the Read tool to open ${filePaths.length > 1 ? 'each' : 'it'}:]\n`
      + filePaths.map((p) => `- ${p}`).join('\n');
  }

  const prompt = `[Discord] ${message.author.bot ? '@' + fromName : fromName} said:\n\n${body}`;

  const preamble = [
    `You are operating as a Discord bot named "${AGENT_NAME}" in the company's shared channel.`,
    `To hand work to a peer, mention them by name with @ — e.g. @head-of-software. Available peers: ${peerNames.map((n) => '@' + n).join(', ')}.`,
    `Only mention a peer when you genuinely need them; each mention spawns their agent and costs tokens.`,
    `When the task is done or you are blocked, address the founder and give a terse summary.`,
    `Keep replies short (a few lines). Durable handoffs and records go through GitHub issues; @mentions are for live coordination.`,
    `For current company state, read company/memory/BRIEF.md first; read the full COMPANY.md only if you actually need the detail.`
  ].join(' ');

  const snippet = body.replace(/\s+/g, ' ').slice(0, 100);
  const resumeId = loadSessionId();
  console.log(`[${AGENT_NAME}] ▶ turn from ${message.author.bot ? '@' + fromName : fromName}${resumeId ? ' (resumed)' : ''}: "${snippet}"`);
  const t0 = Date.now();
  let res = await runClaude(prompt, preamble, resumeId);
  // If a stored session vanished (e.g. cleared on disk), retry once fresh.
  if (res.errored && resumeId && /no conversation|session/i.test(res.raw || '')) {
    console.log(`[${AGENT_NAME}] stored session ${resumeId} not found — starting fresh`);
    res = await runClaude(prompt, preamble, null);
  }
  const { text, cost, errored, raw, sessionId } = res;
  if (useSession && sessionId) saveSessionId(sessionId);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[${AGENT_NAME}] ${errored ? '✗ error' : '✓ done'} in ${secs}s · $${(cost || 0).toFixed(4)}`);

  // Account for spend; remind (do NOT freeze) if over the configured limits.
  let frozenNote = '';
  if (cost) {
    const r = await store.addSpend(cost, spendLimits);
    if (r.limitHit) frozenNote = `\n\n⚠️ Spend limit reached (today $${r.dailyUsd.toFixed(2)}, session $${r.sessionUsd.toFixed(2)}). Agents stay live — \`/freeze\` to stop manually.`;
  }

  if (errored) {
    await send(message.channel, `❌ ${AGENT_NAME} hit an error:\n\`\`\`\n${(raw || 'no output').slice(0, 1200)}\n\`\`\``);
    return;
  }

  let out = (text || '').trim();
  if (!out) {
    if (!message.author.bot) await send(message.channel, `(${AGENT_NAME}: no output)`);
    return; // stay silent on empty bot-to-bot turns to avoid noise
  }
  out = rewriteOutgoing(out, idStore.load()) + frozenNote;
  await send(message.channel, out);
}

// Run a single scoped claude turn. Resolves { text, cost, errored, raw }.
// Default: --output-format json (one final blob, quiet). With LOG_AGENT_STEPS=1:
// --output-format stream-json so each thinking/tool step is logged as it happens.
function runClaude(prompt, preamble, resumeId) {
  return new Promise((resolvePromise) => {
    const args = [
      '--print',
      '--agent', AGENT_NAME,
      '--model', model,
      '--output-format', logSteps ? 'stream-json' : 'json',
      ...(logSteps ? ['--verbose'] : []),
      ...(resumeId ? ['--resume', resumeId] : []),
      '--add-dir', projectDir,
      '--append-system-prompt', preamble,
      '--dangerously-skip-permissions'
    ];
    const proc = spawn(CLAUDE_CMD, args, { cwd: projectDir, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '', stderr = '', lineBuf = '';
    let final = null; // the {type:"result"} object, captured from the stream
    proc.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      if (!logSteps) return;
      lineBuf += s;
      let nl;
      while ((nl = lineBuf.indexOf('\n')) !== -1) {
        const line = lineBuf.slice(0, nl).trim();
        lineBuf = lineBuf.slice(nl + 1);
        if (line) handleStreamLine(line, (r) => { final = r; });
      }
    });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      try { process.kill(-proc.pid, 'SIGTERM'); } catch {}
      resolvePromise({ text: '', cost: 0, errored: true, raw: `timed out after ${CLAUDE_TIMEOUT_MINUTES} min` });
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        const out = stderr + stdout;
        if (/usage limit reached/i.test(out)) {
          resolvePromise({ text: '', cost: 0, errored: true, raw: 'Claude usage limit reached — try again after it resets.' });
          return;
        }
        resolvePromise({ text: '', cost: 0, errored: true, raw: (stderr || stdout) });
        return;
      }
      if (logSteps) {
        if (final) resolvePromise({ text: final.result ?? '', cost: final.total_cost_usd ?? 0, errored: !!final.is_error, raw: stdout, sessionId: final.session_id });
        else resolvePromise({ text: stdout.trim(), cost: 0, errored: false, raw: stdout });
        return;
      }
      // --output-format json -> a single result object with result + total_cost_usd.
      try {
        const j = JSON.parse(stdout);
        resolvePromise({ text: j.result ?? '', cost: j.total_cost_usd ?? 0, errored: !!j.is_error, raw: stdout, sessionId: j.session_id });
      } catch {
        resolvePromise({ text: stdout.trim(), cost: 0, errored: false, raw: stdout });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolvePromise({ text: '', cost: 0, errored: true, raw: `failed to start claude: ${err.message}` });
    });
  });
}

// Parse one NDJSON line from stream-json mode: log readable steps, and hand the
// final result object back to the caller.
function handleStreamLine(line, onResult) {
  let ev;
  try { ev = JSON.parse(line); } catch { return; }
  if (ev.type === 'assistant' && ev.message?.content) {
    for (const block of ev.message.content) {
      if (block.type === 'text' && block.text?.trim()) {
        console.log(`[${AGENT_NAME}]   💭 ${block.text.replace(/\s+/g, ' ').trim().slice(0, 160)}`);
      } else if (block.type === 'tool_use') {
        const arg = JSON.stringify(block.input || {}).slice(0, 80);
        console.log(`[${AGENT_NAME}]   🔧 ${block.name}(${arg})`);
      }
    }
  } else if (ev.type === 'result') {
    onResult(ev);
  }
}

// Largest attachment we will download into memory. Anything bigger is skipped
// (logged, chain continues) to avoid loading huge files. Discord provides a.size.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

// Download all attachments on a Discord message to a per-message folder under
// .discord-agents/ (gitignored, inside projectDir so Claude's Read tool can open
// them — it handles .md/.txt/PDF/images alike). Returns absolute paths. Files
// over MAX_ATTACHMENT_BYTES and failures are skipped.
async function saveAttachments(message) {
  const files = [...message.attachments.values()];
  if (!files.length) return [];
  const dir = join(attachmentsDir, message.id);
  try { mkdirSync(dir, { recursive: true }); } catch (e) { console.error(`[${AGENT_NAME}] attachment dir failed`, e.message); return []; }
  const paths = [];
  for (const a of files) {
    if (typeof a.size === 'number' && a.size > MAX_ATTACHMENT_BYTES) {
      console.log(`[${AGENT_NAME}] skipping ${a.name} (${(a.size / 1024 / 1024).toFixed(1)} MB > 25 MB limit)`);
      continue;
    }
    try {
      const res = await fetch(a.url);
      if (!res.ok) { console.error(`[${AGENT_NAME}] attachment fetch ${res.status} for ${a.name}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const safe = (a.name || `file-${paths.length}`).replace(/[^\w.\-]/g, '_');
      const p = join(dir, safe);
      writeFileSync(p, buf);
      paths.push(p);
    } catch (e) { console.error(`[${AGENT_NAME}] attachment download failed`, e.message); }
  }
  if (paths.length) console.log(`[${AGENT_NAME}] saved ${paths.length} attachment(s) to ${dir}`);
  return paths;
}

function founderTag() {
  const first = [...allowedUsers][0];
  return first ? `<@${first}>` : 'the founder';
}

async function send(channel, text) {
  for (const chunk of chunkMessage(text, 1900)) {
    try { await channel.send(chunk); } catch (e) { console.error(`[${AGENT_NAME}] send failed`, e.message); }
  }
}
async function ack(message, text) { await safeReact(message, '✅'); await send(message.channel, text); }
async function safeReact(message, emoji) { try { await message.react(emoji); } catch {} }

client.login(token);
