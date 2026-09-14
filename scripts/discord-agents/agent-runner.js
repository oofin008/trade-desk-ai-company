// Per-agent Discord process.
//
// One of these runs for each entry in roster.json. It connects to Discord as
// that agent's own bot, listens for messages that address it, and answers by
// running `claude --print --agent <name>` against the company repo. Because
// every agent is a real bot in the same channel, an agent simply mentioning a
// peer (@head-of-trading) becomes a real ping that the peer's process receives
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
import { extractJobs, extractSummary, canChainJob } from './lib/jobs.js';
import { buildResolvedMcpConfig } from './lib/mcp-config.js';

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
  JOB_TIMEOUT_MINUTES = '180',
  SESSION_USD_LIMIT = '5',
  DAILY_USD_LIMIT = '20',
  SOFTWARE_REPO_PATHS = ''
} = process.env;

if (!AGENT_NAME || !DISCORD_CHANNEL_ID || !AI_STARTUP_DIR) {
  console.error('Missing required env. Set AGENT_NAME, DISCORD_CHANNEL_ID, AI_STARTUP_DIR.');
  process.exit(1);
}

const projectDir = resolve(AI_STARTUP_DIR);
const stateDir = join(projectDir, '.discord-agents');
// Local clones of the software repos this company builds, comma-
// separated. Paths are per-machine so they live in .env (gitignored), not
// committed config. Example: SOFTWARE_REPO_PATHS=/path/to/repo-a,/path/to/repo-b
const softwareRepoDirs = SOFTWARE_REPO_PATHS
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => resolve(p));
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

// MCP servers (github / discord). `claude --print` loads MCP only when
// passed `--mcp-config <file> --strict-mcp-config`. We resolve the `${VAR}`
// placeholders in the repo-root `.mcp.json` from the runner's own env (already
// loaded by loadEnvFile above) into a private per-agent tmp file, and pass it
// only to MCP-enabled agents.
// Runtime-only: `pm2 restart all` to pick up changes, no hot reload.
// Enabled agents: `roster.json` entries with a non-empty `mcp` array (compiled
// from `capabilities.mcp` in the agent's ADL spec). None currently declare one.
const mcpEnabledAgents = new Set(
  roster.filter((r) => Array.isArray(r.mcp) && r.mcp.length > 0).map((r) => r.name)
);
const resolvedMcpConfigPath = buildResolvedMcpConfig(projectDir, AGENT_NAME, process.env);
if (resolvedMcpConfigPath) {
  console.log(`[${AGENT_NAME}] MCP config resolved → ${resolvedMcpConfigPath} (this agent MCP-enabled: ${mcpEnabledAgents.has(AGENT_NAME)})`);
}

// Extra CLI args that enable MCP for `agentName`, or [] when MCP is unavailable
// or this agent isn't on the allowlist (its args stay byte-for-byte unchanged).
function mcpArgsFor(agentName) {
  if (!resolvedMcpConfigPath || !mcpEnabledAgents.has(agentName)) return [];
  return ['--mcp-config', resolvedMcpConfigPath, '--strict-mcp-config'];
}

const hopBudget = Math.max(1, parseInt(HOP_BUDGET, 10));
const maxConcurrency = Math.max(1, parseInt(MAX_CONCURRENCY, 10));
const timeoutMs = Math.max(1, parseFloat(CLAUDE_TIMEOUT_MINUTES)) * 60 * 1000;
const jobTimeoutMs = Math.max(1, parseFloat(JOB_TIMEOUT_MINUTES)) * 60 * 1000;
// How many jobs a head may chain from job-followup turns before the runner
// refuses to start more (runaway-chain guard — see issue #1). Counts jobs
// chained *beyond* the original (dev=depth0 -> qa=depth1 -> fix=depth2 ...);
// at the cap the chain pauses and pings the founder.
// Bumped 3 -> 12 (founder, 2026-08-31): a real multi-task build phase runs
// dev->QA->(fix->QA)->merge->next-dev serially, ~3-5 hops per task over many
// tasks — a cap of 3 stalled the chain after ~1 task and needed a manual
// channel nudge every time. 12 covers a full phase segment while still
// bounding a runaway loop. Revisit if a phase legitimately needs deeper
// chains (better: reset the counter on any human channel message).
const MAX_JOB_CHAIN_DEPTH = 12;
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

// Per-agent Claude session ids (name -> { id, contextTokens, updatedAt }),
// shared file so /reset can wipe everyone's memory at once and /status can
// read every agent's context size. We resume our own id each turn.
// contextTokens is this agent's most recent turn's cache_read +
// cache_creation + input tokens — an approximation of how large its resumed
// session's context currently is (see usageTokens below). It only ever grows
// until a /reset, since --resume carries the whole history forward each turn.
// Older entries may still be a bare session-id string (pre-tracking format);
// loadSessionId/contextTokensFor accept both.
const sessionsPath = join(stateDir, 'sessions.json');
const readSessions = () => { try { return JSON.parse(readFileSync(sessionsPath, 'utf8')); } catch { return {}; } };
const loadSessionId = () => {
  if (!useSession) return null;
  const entry = readSessions()[AGENT_NAME];
  if (!entry) return null;
  return typeof entry === 'string' ? entry : entry.id;
};
const saveSessionId = (id, contextTokens) => {
  const m = readSessions();
  const prev = m[AGENT_NAME];
  const prevTokens = prev && typeof prev === 'object' ? prev.contextTokens : undefined;
  m[AGENT_NAME] = { id, contextTokens: contextTokens ?? prevTokens, updatedAt: new Date().toISOString() };
  writeFileSync(sessionsPath, JSON.stringify(m, null, 2));
};
const clearAllSessions = () => { try { writeFileSync(sessionsPath, '{}'); } catch {} };
// Warn (in /status) once an agent's tracked context crosses this — purely a
// visibility cue for the founder, nothing here auto-resets.
const CONTEXT_WARN_TOKENS = 120000;
const formatTokens = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

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

// The turn currently running (if any) — { proc, finish } — so /stop and
// /redirect can act on it directly instead of waiting behind it in the queue.
let activeTurn = null;

// Kill the in-flight claude process (if one is running) and settle its promise
// immediately. Returns true if something was actually running.
function interruptActiveTurn() {
  if (!activeTurn) return false;
  const { proc, finish } = activeTurn;
  try { process.kill(-proc.pid, 'SIGTERM'); } catch {}
  finish({ text: '', cost: 0, errored: false, interrupted: true, raw: 'interrupted by founder' });
  return true;
}

// /stop and /redirect must be able to act on a turn that's already running, so
// they're intercepted here — before the FIFO queue — rather than inside
// handle(), which only ever runs once the current turn has finished.
async function maybeHandleInterrupt(message) {
  const fromHuman = !message.author.bot;
  if (!fromHuman || !allowedUsers.has(message.author.id)) return false;

  const ids = idStore.load();
  const addressed =
    addressesName(message, AGENT_NAME, client.user.id, client.user.username) ||
    (isPrimary && !mentionsAnyAgent(message, ids, allAgentNames));
  if (!addressed) return false;

  const body = humanizeMentions(message.content, ids)
    .replace(new RegExp(`@${AGENT_NAME}\\b`, 'gi'), '')
    .trim();
  const lower = body.toLowerCase();

  if (lower === '/stop') {
    if (interruptActiveTurn()) {
      await safeReact(message, '⏹️');
      await send(message.channel, `⏹️ ${AGENT_NAME}: stopped — current task cancelled.`);
    } else {
      await send(message.channel, `${AGENT_NAME}: nothing in progress to stop.`);
    }
    return true;
  }

  if (lower.startsWith('/redirect')) {
    const instruction = body.slice('/redirect'.length).trim();
    if (!instruction) {
      await send(message.channel, `${AGENT_NAME}: usage — @${AGENT_NAME} /redirect <new instructions>`);
      return true;
    }
    const wasRunning = interruptActiveTurn();
    await safeReact(message, wasRunning ? '↪️' : '🔄');
    // Re-enter the normal queue so this still gets hop accounting, the frozen
    // check, etc. — just tagged so runTurn builds a redirect-flavored prompt
    // instead of taking the raw "/redirect ..." text literally.
    message.__redirect = { instruction, wasRunning };
    queue.push(message);
    pump();
    return true;
  }

  return false;
}

client.on('messageCreate', (message) => {
  if (message.channelId !== DISCORD_CHANNEL_ID) return;
  if (message.author.id === client.user?.id) return; // never react to self
  if (seen.has(message.id)) return;
  seen.add(message.id);
  if (seen.size > 500) seen.delete(seen.values().next().value);
  maybeHandleInterrupt(message).then((handled) => {
    if (handled) return; // /stop acted immediately; /redirect re-queued itself above
    queue.push(message);
    pump();
  }).catch((e) => console.error(`[${AGENT_NAME}] interrupt check failed`, e));
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

  // Founder-only global channel commands. Only the primary bot acts/acks so we
  // don't get five replies; state is shared, so every agent sees the result.
  // Exact-match only — a bare "/redirect ..." or any other slash-prefixed text
  // must fall through to normal handling below, not get swallowed here.
  const cmd = message.content.trim().toLowerCase();
  const GLOBAL_COMMANDS = new Set(['/freeze', '/unfreeze', '/reset', '/status']);
  if (fromHuman && allowedUsers.has(message.author.id) && GLOBAL_COMMANDS.has(cmd)) {
    if (!isPrimary) return;
    if (cmd === '/freeze') { await store.setFrozen(true); return ack(message, '🧊 Frozen. Agents will stop responding. `/unfreeze` to resume.'); }
    if (cmd === '/unfreeze') { await store.setFrozen(false); return ack(message, '▶️ Unfrozen. Agents are live again.'); }
    if (cmd === '/reset') { await store.resetAll(); clearAllSessions(); clearAttachments(); return ack(message, '✅ Chain + spend ledger reset, all agents’ memory cleared, and downloaded attachments removed.'); }
    if (cmd === '/status') {
      const s = store.read();
      const sessions = readSessions();
      const contextLine = allAgentNames
        .map((n) => {
          const entry = sessions[n];
          const tok = entry && typeof entry === 'object' ? entry.contextTokens : undefined;
          if (!tok) return null;
          return `${n} ${formatTokens(tok)}${tok >= CONTEXT_WARN_TOKENS ? '⚠️' : ''}`;
        })
        .filter(Boolean)
        .join(' · ');
      return ack(message, `📊 hops ${s.hops}/${hopBudget} · session $${s.ledger.sessionUsd.toFixed(2)}/${spendLimits.sessionLimit} · today $${s.ledger.dailyUsd.toFixed(2)}/${spendLimits.dailyLimit} · ${s.frozen ? '🧊 frozen' : 'live'}${contextLine ? `\n🧠 ${contextLine}` : ''}`);
    }
    return;
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
  let body;
  if (message.__redirect) {
    const { instruction, wasRunning } = message.__redirect;
    body = wasRunning
      ? `[Founder interrupted your previous task to redirect you]\nNew instructions: ${instruction}`
      : instruction;
  } else {
    body = humanizeMentions(message.content, ids)
      .replace(new RegExp(`@${AGENT_NAME}\\b`, 'gi'), '')
      .trim();
  }

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
    `To hand work to a peer, mention them by name with @ — e.g. @head-of-trading. Available peers: ${peerNames.map((n) => '@' + n).join(', ')}.`,
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
  const { text, cost, errored, raw, sessionId, interrupted, contextTokens } = res;
  if (useSession && sessionId) saveSessionId(sessionId, contextTokens);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (interrupted) {
    // /stop or /redirect already sent their own message; nothing more to say.
    console.log(`[${AGENT_NAME}] ⏹ interrupted after ${secs}s`);
    return;
  }
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

  // Pull out any [[JOB agent=...]]...[[/JOB]] blocks before posting — those are
  // instructions to the runner, not something the founder should see raw.
  const { text: visible, jobs } = extractJobs(out);
  out = rewriteOutgoing(visible, idStore.load()) + frozenNote;
  const sent = await send(message.channel, out || `(${AGENT_NAME}: started a background job — see thread below)`);

  // Jobs run detached from this turn/queue: they must NOT block pump() from
  // handling the next Discord message, otherwise a long job just reintroduces
  // the same "can't respond while busy" problem it exists to solve.
  for (const job of jobs) {
    const anchor = sent[sent.length - 1] || message;
    startJob(anchor, job).catch((e) => console.error(`[${AGENT_NAME}] job failed to start`, e.message));
  }
}

// Open the Discord thread for a fresh, top-level job (only ever called once
// per job dispatch out of a normal turn — see runTurn) and hand off the
// actual run to runJob, which is shared with chained job dispatches.
async function startJob(anchorMessage, job) {
  const { agent, prompt } = job;
  let thread;
  try {
    thread = await anchorMessage.startThread({
      name: `${agent}: ${prompt.replace(/\s+/g, ' ').slice(0, 80)}`,
      autoArchiveDuration: 1440
    });
  } catch (e) {
    console.error(`[${AGENT_NAME}] could not open thread for job (${agent})`, e.message);
    await send(anchorMessage.channel, `⚠️ ${AGENT_NAME}: couldn't open a thread for the ${agent} job (${e.message}) — it did not run.`);
    return;
  }
  await runJob(thread, job, 0);
}

// Run one job to completion in an already-open Discord thread, entirely
// independent of this turn/process's own lifecycle. This is the actual fix
// for "agents that say they'll ping back but don't": a Task-tool background
// subagent dies the moment this turn's `claude --print` process exits,
// because nothing outlives that process to deliver its result later.
// agent-runner.js itself, by contrast, is a long-lived process (kept alive by
// pm2) — so it, not the model, is what supervises the job and posts the
// result whenever it lands.
//
// Shared between a fresh top-level job (via startJob, depth 0) and a job
// chained from a follow-up turn (via runJobFollowup, depth > 0) — reusing the
// same thread keeps the whole trail (e.g. dev -> QA -> PR reaction) coherent
// in one place instead of scattering it across threads (issue #1).
async function runJob(thread, job, depth) {
  const { agent, prompt } = job;
  console.log(`[${AGENT_NAME}] ▶ job started (depth ${depth}): ${agent} — "${prompt.replace(/\s+/g, ' ').slice(0, 100)}"`);
  await send(thread, `▶️ ${agent} started — will report back in this thread when done.`);

  await store.acquireSlot(maxConcurrency);
  const t0 = Date.now();
  let res;
  try {
    res = await runSpecialistJob(agent, prompt);
  } finally {
    await store.releaseSlot();
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (res.cost) await store.addSpend(res.cost, spendLimits);
  console.log(`[${AGENT_NAME}] ${res.errored ? '✗ job error' : '✓ job done'} (${agent}) in ${secs}s`);

  if (res.errored) {
    await send(thread, `❌ ${agent} hit an error after ${secs}s:\n\`\`\`\n${(res.raw || 'no output').slice(0, 1200)}\n\`\`\`\n${founderTag()} — this needs a look.`);
    return;
  }

  const resultText = (res.text || '(no output)').trim();
  // Strip the [[SUMMARY]] block (if the specialist included one, per its
  // preamble in runSpecialistJob) before showing the human the full reply —
  // the block is for the runner, not the thread.
  const { text: displayText, summary } = extractSummary(resultText);
  await send(thread, `✅ ${agent} finished in ${secs}s:\n\n${displayText.slice(0, 1800)}`);

  // Let the dispatching head react to the result in its own session — QA,
  // open a PR, update memory — exactly as it would if the work had finished
  // synchronously inside its own turn. Posted into the same thread. Only the
  // bounded summary (not the full reply) goes into that session's permanent
  // history, so a long chain of jobs doesn't balloon its context turn over
  // turn (see extractSummary). Fall back to a tail slice — the verdict is
  // usually near the end — if the specialist didn't include a summary block.
  const contextSummary = summary || displayText.slice(-1200);
  await runJobFollowup(thread, agent, prompt, contextSummary, depth);
}

// Resume the dispatching head's own session with the finished job's result so
// it can continue its normal workflow, and post its reaction to the thread.
// depth is the depth of the job that just finished (0 for the original,
// top-level job) — used to guard against unbounded chained-job dispatch below.
async function runJobFollowup(thread, jobAgent, jobPrompt, contextSummary, depth = 0) {
  const preamble = [
    `You are operating as a Discord bot named "${AGENT_NAME}" in the company's shared channel.`,
    `To hand work to a peer, mention them by name with @ — e.g. @head-of-trading. Available peers: ${peerNames.map((n) => '@' + n).join(', ')}.`,
    `Only mention a peer when you genuinely need them; each mention spawns their agent and costs tokens.`,
    `Keep replies short (a few lines). Durable handoffs and records go through GitHub issues; @mentions are for live coordination.`
  ].join(' ');
  // contextSummary is a bounded summary, not the job's full output (see
  // runJob/extractSummary) — the full detail already went to the thread as
  // its own message, which this session doesn't need to carry forever.
  const prompt = `[System] The background job you dispatched (${jobAgent}) just finished — its full output was already posted to this thread above.\n\nWhat you asked it to do:\n${jobPrompt}\n\n${jobAgent}'s result (summary):\n${contextSummary}\n\nContinue your normal workflow from here (e.g. QA, open a draft PR, update memory) or say what's blocking you. This reply is posted to the thread the founder is watching, so make it a real status update.`;

  await store.acquireSlot(maxConcurrency);
  let res;
  try {
    res = await runClaude(prompt, preamble, loadSessionId(), { trackInterrupt: false });
  } finally {
    // Release BEFORE looking at the result / dispatching any chained job below
    // — runJob() does its own acquireSlot(), so releasing here first avoids
    // self-deadlocking on maxConcurrency when a job is chained straight out of
    // this follow-up turn. Keep this ordering if you touch this function.
    await store.releaseSlot();
  }
  if (useSession && res.sessionId) saveSessionId(res.sessionId, res.contextTokens);
  if (res.cost) await store.addSpend(res.cost, spendLimits);

  if (res.errored) {
    await send(thread, `❌ ${AGENT_NAME} hit an error continuing after the ${jobAgent} job:\n\`\`\`\n${(res.raw || 'no output').slice(0, 1200)}\n\`\`\``);
    return;
  }
  const out = (res.text || '').trim();
  if (!out) return;

  // Same [[JOB]] parsing runTurn() does for main-channel turns — without this,
  // a head chaining e.g. qa from inside a job's own follow-up turn had its
  // marker posted as literal text and no job ever started (issue #1).
  const { text: visible, jobs } = extractJobs(out);
  if (visible) await send(thread, rewriteOutgoing(visible, idStore.load()));

  if (!jobs.length) return;
  if (!canChainJob(depth, MAX_JOB_CHAIN_DEPTH)) {
    await send(thread, `⚠️ ${AGENT_NAME}: hit the chained-job depth limit (${MAX_JOB_CHAIN_DEPTH}) — not starting ${jobs.map((j) => j.agent).join(', ')}. ${founderTag()} take it from here.`);
    return;
  }
  for (const job of jobs) {
    runJob(thread, job, depth + 1).catch((e) => console.error(`[${AGENT_NAME}] chained job failed to start`, e.message));
  }
}

// Run a specialist (dev/qa/researcher/...) as its own top-level, independent
// claude invocation — NOT a Task-tool subagent nested inside a head's turn, so
// it isn't torn down when that turn's process exits. Fresh session each job
// (specialists don't carry memory across jobs, same as when invoked via Task).
// Deliberately does not set --model: the specialist's own `.claude/agents/
// <name>.md` frontmatter picks its model, same as when a head invokes it via
// the Task tool.
function runSpecialistJob(agentName, prompt) {
  return new Promise((resolvePromise) => {
    const preamble = [
      `You are running as a background job dispatched by "${AGENT_NAME}" via the Discord agent runner (not a live Task-tool subagent call). Do the task described in the prompt end-to-end. Your full reply is posted verbatim to a Discord thread and read by a human, so write it for that audience.`,
      `After everything else, end your reply with one more block:`,
      `[[SUMMARY]]`,
      `<a short, self-contained summary for "${AGENT_NAME}" to react to: verdict/outcome plus every concrete fact it will need to continue — file paths, PR/issue numbers, branch names, pass/fail. Well under 1000 characters.>`,
      `[[/SUMMARY]]`,
      `Only this block is kept in "${AGENT_NAME}"'s long-term session memory — everything above it is shown to the human once, then discarded from memory. Do not omit it, and do not put anything "${AGENT_NAME}" needs later outside it.`
    ].join('\n');
    const args = [
      '--print',
      '--agent', agentName,
      '--output-format', 'json',
      '--add-dir', projectDir,
      ...softwareRepoDirs.flatMap((dir) => ['--add-dir', dir]),
      '--append-system-prompt', preamble,
      ...mcpArgsFor(agentName),
      '--dangerously-skip-permissions'
    ];
    const proc = spawn(CLAUDE_CMD, args, { cwd: projectDir, stdio: ['pipe', 'pipe', 'pipe'], detached: true });

    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolvePromise(result); } };

    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    // Jobs get their own, much longer timeout — they exist specifically for
    // work that doesn't fit a normal turn's budget.
    const timer = setTimeout(() => {
      try { process.kill(-proc.pid, 'SIGTERM'); } catch {}
      finish({ text: '', cost: 0, errored: true, raw: `job timed out after ${JOB_TIMEOUT_MINUTES} min` });
    }, jobTimeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        const out = stderr + stdout;
        if (/usage limit reached/i.test(out)) {
          finish({ text: '', cost: 0, errored: true, raw: 'Claude usage limit reached — try again after it resets.' });
          return;
        }
        finish({ text: '', cost: 0, errored: true, raw: (stderr || stdout) });
        return;
      }
      try {
        const j = JSON.parse(stdout);
        finish({ text: j.result ?? '', cost: j.total_cost_usd ?? 0, errored: !!j.is_error, raw: stdout });
      } catch {
        finish({ text: stdout.trim(), cost: 0, errored: false, raw: stdout });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      finish({ text: '', cost: 0, errored: true, raw: `failed to start claude: ${err.message}` });
    });
  });
}

// Run a single scoped claude turn. Resolves { text, cost, errored, raw }.
// Default: --output-format json (one final blob, quiet). With LOG_AGENT_STEPS=1:
// --output-format stream-json so each thinking/tool step is logged as it happens.
function runClaude(prompt, preamble, resumeId, { trackInterrupt = true } = {}) {
  return new Promise((resolvePromise) => {
    const args = [
      '--print',
      '--agent', AGENT_NAME,
      '--model', model,
      '--output-format', logSteps ? 'stream-json' : 'json',
      ...(logSteps ? ['--verbose'] : []),
      ...(resumeId ? ['--resume', resumeId] : []),
      '--add-dir', projectDir,
      ...softwareRepoDirs.flatMap((dir) => ['--add-dir', dir]),
      '--append-system-prompt', preamble,
      ...mcpArgsFor(AGENT_NAME),
      '--dangerously-skip-permissions'
    ];
    const proc = spawn(CLAUDE_CMD, args, { cwd: projectDir, stdio: ['pipe', 'pipe', 'pipe'], detached: true });

    // Settle exactly once, whether via the process's own close/error event or
    // via interruptActiveTurn() killing it early from a /stop or /redirect.
    // trackInterrupt is false for job-followup turns (see runJobFollowup) so
    // they don't fight the foreground queue's turn over the activeTurn slot —
    // /stop only ever targets the queue's current turn, not a job followup.
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (trackInterrupt && activeTurn && activeTurn.proc === proc) activeTurn = null;
      resolvePromise(result);
    };
    if (trackInterrupt) activeTurn = { proc, finish };

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
      finish({ text: '', cost: 0, errored: true, raw: `timed out after ${CLAUDE_TIMEOUT_MINUTES} min` });
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        const out = stderr + stdout;
        if (/usage limit reached/i.test(out)) {
          finish({ text: '', cost: 0, errored: true, raw: 'Claude usage limit reached — try again after it resets.' });
          return;
        }
        finish({ text: '', cost: 0, errored: true, raw: (stderr || stdout) });
        return;
      }
      if (logSteps) {
        if (final) finish({ text: final.result ?? '', cost: final.total_cost_usd ?? 0, errored: !!final.is_error, raw: stdout, sessionId: final.session_id, contextTokens: usageTokens(final.usage) });
        else finish({ text: stdout.trim(), cost: 0, errored: false, raw: stdout });
        return;
      }
      // --output-format json -> a single result object with result + total_cost_usd.
      try {
        const j = JSON.parse(stdout);
        finish({ text: j.result ?? '', cost: j.total_cost_usd ?? 0, errored: !!j.is_error, raw: stdout, sessionId: j.session_id, contextTokens: usageTokens(j.usage) });
      } catch {
        finish({ text: stdout.trim(), cost: 0, errored: false, raw: stdout });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      finish({ text: '', cost: 0, errored: true, raw: `failed to start claude: ${err.message}` });
    });
  });
}

// Approximate size of a resumed session's context from one turn's usage block:
// cache_read (prior context reused from cache) + cache_creation (new context
// this turn, now cached) + input (uncached tokens this turn). Since --resume
// carries the whole prior conversation forward, this is a reasonable proxy
// for "how big is this agent's session right now" — see CONTEXT_WARN_TOKENS.
function usageTokens(usage) {
  if (!usage) return undefined;
  return (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.input_tokens || 0);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A turn can run for minutes; if the gateway drops mid-turn (DNS blip, network
// hiccup) and hasn't finished reconnecting by the time we try to post the
// result, channel.send can fail transiently ("Expected token to be set for
// this request, but none was present" is the discord.js symptom of exactly
// this race). Retrying with backoff gives the reconnect a chance to finish
// instead of the turn's entire result — the thing it was working on for
// however long — silently vanishing.
async function send(channel, text) {
  const sent = [];
  for (const chunk of chunkMessage(text, 1900)) {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        sent.push(await channel.send(chunk));
        ok = true;
      } catch (e) {
        console.error(`[${AGENT_NAME}] send failed (attempt ${attempt}/3)`, e.message);
        if (attempt < 3) await sleep(attempt * 3000);
      }
    }
  }
  return sent;
}
async function ack(message, text) { await safeReact(message, '✅'); await send(message.channel, text); }
async function safeReact(message, emoji) { try { await message.react(emoji); } catch {} }

client.login(token);
