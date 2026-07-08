// Discord bridge for AI Startup
//
// Listens to a Discord channel. Each message is forwarded to Claude Code
// running in "print" (headless) mode against the ai-startup project.
//
// The bridge captures Claude's stdout and posts it back to the channel when
// the process finishes. This does not depend on Claude calling any MCP tool
// to reply — whatever Claude prints in --print mode is relayed to Discord.
// The bridge also handles errors (non-zero exit, hung process killed by timeout).
//
// Usage:
//   node bridge.js
//
// Env is loaded from the repo-root .env file (two levels up from this script).
// Process env takes precedence over .env values.
//
// Required env:
//   DISCORD_TOKEN       — bot token (https://discord.com/developers/applications)
//   DISCORD_CHANNEL_ID  — the single channel the bot listens in (avoid global access)
//   AI_STARTUP_DIR      — absolute path to the ai-startup project root
//
// Optional env:
//   CLAUDE_CMD             — path to `claude` binary (default: 'claude')
//   ALLOWED_USER_IDS       — comma-separated Discord user IDs allowed to issue commands
//                             (highly recommended — without this anyone in the channel can drive your company)
//   ADD_DIRS               — comma-separated absolute paths Claude is allowed to read/write
//                             beyond AI_STARTUP_DIR (e.g. /Users/you/other-project,/tmp/data)
//   CLAUDE_TIMEOUT_MINUTES — safety kill timeout in minutes (default: 60)
//                             Claude is killed if it hasn't finished by this time.
//   RESUME_FALLBACK_MINUTES — when a usage limit is hit but no reset time can be
//                             parsed, how long to wait before auto-resuming (default: 60)

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env'));

const {
  DISCORD_TOKEN,
  DISCORD_CHANNEL_ID,
  AI_STARTUP_DIR,
  CLAUDE_CMD = 'claude',
  ALLOWED_USER_IDS = '',
  ADD_DIRS = '',
  CLAUDE_TIMEOUT_MINUTES = '60',
  RESUME_FALLBACK_MINUTES = '60'
} = process.env;

const timeoutMs = Math.max(1, parseFloat(CLAUDE_TIMEOUT_MINUTES)) * 60 * 1000;
const fallbackResumeMs = Math.max(1, parseFloat(RESUME_FALLBACK_MINUTES)) * 60 * 1000;
const extraDirs = ADD_DIRS.split(',').map(s => s.trim()).filter(Boolean);

if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID || !AI_STARTUP_DIR) {
  console.error('Missing required env. Set DISCORD_TOKEN, DISCORD_CHANNEL_ID, AI_STARTUP_DIR.');
  process.exit(1);
}

const allowedUsers = new Set(ALLOWED_USER_IDS.split(',').map(s => s.trim()).filter(Boolean));
const projectDir = resolve(AI_STARTUP_DIR);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Tracks the running Claude process. Only one runs at a time.
let runningProcess = null;
// Tracks whether we have an active Claude session to --continue into.
let conversationActive = false;
// Timer scheduled when we hit a usage limit and are waiting to auto-resume.
let pendingRetry = null;

client.once('ready', () => {
  console.log(`Discord bridge online as ${client.user.tag}`);
  console.log(`Listening on channel: ${DISCORD_CHANNEL_ID}`);
  console.log(`Project dir: ${projectDir}`);
  if (allowedUsers.size === 0) {
    console.warn('⚠️  ALLOWED_USER_IDS not set — ANY user in the channel can drive your company.');
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== DISCORD_CHANNEL_ID) return;
  if (allowedUsers.size > 0 && !allowedUsers.has(message.author.id)) {
    await message.reply('You are not authorized to drive the AI startup.');
    return;
  }

  const prompt = message.content.trim();
  if (!prompt) return;

  // /reset — drop session history and kill any running task
  if (prompt === '/reset') {
    killRunning();
    conversationActive = false;
    await message.react('✅');
    await message.channel.send('Session reset. Next message starts a fresh session.');
    return;
  }

  // /cancel — kill current task (and any pending auto-resume) without resetting session history
  if (prompt === '/cancel') {
    if (runningProcess || pendingRetry) {
      killRunning();
      await message.react('✅');
      await message.channel.send('Current task cancelled.');
    } else {
      await message.reply('No task is currently running.');
    }
    return;
  }

  if (pendingRetry) {
    await message.reply('Waiting to auto-resume after a usage limit. Use `/cancel` to abandon it first.');
    return;
  }

  if (runningProcess) {
    await message.reply('Previous task still running. Use `/cancel` to stop it first.');
    return;
  }

  await message.react('🔄');

  runningProcess = spawnClaude(prompt, conversationActive, message.channel);
  conversationActive = true;
});

function killRunning() {
  if (pendingRetry) { clearTimeout(pendingRetry); pendingRetry = null; }
  if (!runningProcess) return;
  try { process.kill(-runningProcess.pid, 'SIGTERM'); } catch (_) {}
  runningProcess = null;
}

function spawnClaude(prompt, continueSession, channel) {
  const args = ['--print', '--dangerously-skip-permissions'];
  if (continueSession) args.push('--continue');
  for (const dir of extraDirs) args.push('--add-dir', dir);

  // detached: true creates a new process group so we can kill Claude
  // and all its subagents together with a negative-PID signal.
  const proc = spawn(CLAUDE_CMD, args, {
    cwd: projectDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true
  });
  proc.stdin.write(prompt);
  proc.stdin.end();

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  // Safety kill: if Claude hangs past the timeout, terminate it.
  const timeout = setTimeout(async () => {
    try { process.kill(-proc.pid, 'SIGTERM'); } catch (_) {}
    runningProcess = null;
    await channel.send(`❌ Claude was still running after ${CLAUDE_TIMEOUT_MINUTES} minutes and was stopped.`);
  }, timeoutMs);

  proc.on('close', async (code) => {
    clearTimeout(timeout);
    runningProcess = null;
    if (code !== 0 && code !== null) {
      // If Claude hit the plan's usage limit, schedule an auto-resume rather than giving up.
      const resumeAt = parseUsageLimitReset(stderr + stdout);
      if (resumeAt) {
        scheduleResume(prompt, channel, resumeAt);
        return;
      }
      const detail = (stderr || stdout).slice(0, 1500) || 'no output';
      await channel.send(`❌ Claude exited with error (code ${code}):\n\`\`\`\n${detail}\n\`\`\``);
      return;
    }
    // Success: relay Claude's printed response back to the channel.
    const reply = stdout.trim();
    if (!reply) {
      await channel.send('✅ Done (Claude produced no text output).');
      return;
    }
    for (const chunk of chunkMessage(reply, 1900)) {
      await channel.send(chunk);
    }
  });

  proc.on('error', async (err) => {
    clearTimeout(timeout);
    runningProcess = null;
    await channel.send(`❌ Failed to start Claude: ${err.message}`);
  });

  return proc;
}

// Detect a Claude Code usage-limit error and return when the limit resets,
// as epoch milliseconds. Returns null if the output is not a usage-limit error.
//
// Claude reports this as "Claude AI usage limit reached|<epoch-seconds>".
// If the marker is present but no timestamp is parseable, fall back to a
// fixed wait (RESUME_FALLBACK_MINUTES) so we still resume eventually.
function parseUsageLimitReset(output) {
  if (!/usage limit reached/i.test(output)) return null;
  const m = output.match(/usage limit reached\D*(\d{10,13})/i);
  if (m) {
    const n = Number(m[1]);
    return m[1].length <= 10 ? n * 1000 : n; // 10-digit = seconds, 13 = ms
  }
  return Date.now() + fallbackResumeMs;
}

// Wait until the usage limit resets, then re-run the same prompt with --continue.
function scheduleResume(prompt, channel, resumeAt) {
  const waitMs = Math.max(0, resumeAt - Date.now()) + 5000; // small buffer past reset
  const when = new Date(resumeAt).toLocaleString();
  channel.send(`⏳ Hit Claude usage limit. Auto-resuming at ${when} (in ~${Math.round(waitMs / 60000)} min). Use \`/cancel\` to abandon.`);
  pendingRetry = setTimeout(() => {
    pendingRetry = null;
    channel.send('▶️ Usage limit reset — resuming.');
    runningProcess = spawnClaude(prompt, true, channel);
  }, waitMs);
}

// Split text into Discord-sendable chunks, preferring to break on line
// boundaries and falling back to hard slicing for very long lines.
function chunkMessage(text, limit) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (line.length > limit) {
      if (current) { chunks.push(current); current = ''; }
      for (let i = 0; i < line.length; i += limit) {
        chunks.push(line.slice(i, i + limit));
      }
      continue;
    }
    if (current.length + line.length + 1 > limit) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function loadEnvFile(path) {
  let contents;
  try {
    contents = readFileSync(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

client.login(DISCORD_TOKEN);
