# Discord Agents — multi-agent company in one channel

Each agent (`ceo` + the four office heads) runs as its **own Discord bot** in
one shared channel. You address an agent with `@ceo` / `@head-of-trading`, it
replies *as itself*, and it hands off to a peer by mentioning them — which is a
real ping that the peer's bot receives. **Discord is the message bus**; there is
no central router.

Specialists (`trader`, `quant-researcher`, `execution-engineer`,
`compliance-officer`, `treasury-manager`, `accountant`, `legal-counsel`) are
**not** bots — they still run as `Task`-tool subagents *inside* the relevant
head's invocation, exactly as before.

> Supersedes `scripts/discord-bridge/` (single-driver mode). Keep the old bridge
> around as a fallback during transition; retire it once this is validated.

## How it works

```
You: @head-of-trading approve the new funding-basis strategy
  head-of-trading  (its bot runs `claude --print --agent head-of-trading`)
    → spawns quant-researcher + execution-engineer via the Task tool internally (not separate bots)
    → posts: "Backtest checks out, connector deployed to paper. @risk-manager for sign-off"
       (the @mentions are rewritten to real pings → those bots fire)
  ...auto-chaining continues until the HOP_BUDGET is reached, then it pauses
     and pings you for direction.
```

- **Founder messages** start a fresh chain (free — they don't consume the hop budget).
- **Agent→agent** mentions each consume one hop; at the budget the chain pauses and pings you.
- Shared coordination state lives in `.discord-agents/` (gitignored): `state.json`
  (hops, freeze, spend ledger), `ids.json` (agent name → bot user id).

## Setup

You need **one Discord bot application per agent** (5 total). For each one:

1. https://discord.com/developers/applications → **New Application** (name it e.g. `ceo`, `head-of-trading`, …).
2. **Bot** → Reset Token → copy it. Enable **Message Content Intent**.
3. **OAuth2 → URL Generator** → scopes `bot`; permissions: `Send Messages`, `Read Message History`, `Add Reactions`, `Create Public Threads`, `Send Messages in Threads` (the last two power the background-job mechanism below). Open the URL and invite the bot into your server.
4. Set the bot's **username** to match its roster name (so `@name` autocompletes), or just type `@name` as plain text — the runner matches both.

All five bots join the **same channel**.

### Env (add to repo-root `.env`)

`.env.example` could not be auto-edited (it's covered by the repo's `.env*` write
deny rule) — add these manually:

```bash
# One token per agent (names match roster.json -> tokenEnv)
DISCORD_TOKEN_CEO=...
DISCORD_TOKEN_TRADING=...
DISCORD_TOKEN_RISK=...
DISCORD_TOKEN_OPERATIONS=...
DISCORD_TOKEN_SECURITY=...

DISCORD_CHANNEL_ID=...           # the one shared channel
ALLOWED_USER_IDS=...             # your Discord user id(s), comma-separated — REQUIRED in practice
AI_STARTUP_DIR=/abs/path/to/your-ai-company

# Cost / safety knobs (all optional, defaults shown)
HOP_BUDGET=30                    # max agent→agent hops per founder message
MAX_CONCURRENCY=2                # max simultaneous claude invocations across all agents
CLAUDE_TIMEOUT_MINUTES=30
SESSION_USD_LIMIT=5              # ledger posts a reminder at this session spend (no freeze)
DAILY_USD_LIMIT=20              # ...and this daily spend

# Memory
AGENT_MEMORY=session             # session = each agent remembers prior turns; off = stateless (cheapest)

# Observability
LOG_AGENT_STEPS=0                # 1 = stream each turn's thinking + tool steps (see "Logging")
```

## Run

```bash
cd scripts/discord-agents
npm install

# Quick local test (all agents in one terminal):
npm start                 # = node launcher.js

# Single agent (validate the mechanism first):
AGENT_NAME=ceo npm run start:one

# Production (persistent, auto-restart, survives reboot): see "Running with pm2".
```

## Running with pm2 (persistent)

pm2 keeps each agent alive, restarts on crash, and can survive reboot. It is
**optional** — `npm start` (above) is enough for testing. If you don't want a
global install, prefix every command with `npx ` (e.g. `npx pm2 list`).

Each agent runs as a pm2 process named **`agent-<name>`** (`agent-ceo`,
`agent-head-of-trading`, …), defined in `ecosystem.config.cjs`.

```bash
# Install (run yourself — global npm installs are denied to the agent)
npm install -g pm2            # or skip and use: npx pm2 ...

# Start the whole roster
cd scripts/discord-agents
pm2 start ecosystem.config.cjs

# Survive reboot
pm2 save                      # snapshot the current process list
pm2 startup                   # prints a command to run once (sets up the boot service)
```

### Monitor

```bash
pm2 list                      # status / restarts (↺) / cpu / mem for all agents
pm2 monit                     # full-screen live dashboard
pm2 describe agent-ceo        # detail for one agent (uptime, restarts, log paths, env)
```

### Logs

```bash
pm2 logs                      # tail all agents, combined
pm2 logs agent-ceo            # just one agent
pm2 logs --lines 200          # last 200 lines, then follow
pm2 flush                     # clear stored logs
```

### Control

```bash
pm2 restart all               # after editing the runner or roster.json
pm2 restart agent-head-of-trading   # one agent
pm2 stop agent-risk-manager   # stop without removing
pm2 delete all                # remove from pm2's list entirely
```

**Health check:** `pm2 list` — watch the restarts (`↺`) column. A climbing count
means an agent is crash-looping; `pm2 logs agent-<name>` shows why (usually a
missing `DISCORD_TOKEN_*` or the bot's Message Content Intent isn't enabled).

## Founder commands

**Global** (type in the channel; only the `ceo` bot acks — state is shared, so every agent sees the result):

- `/status` — current hops, spend, frozen?, and each agent's tracked context size (see "Memory")
- `/freeze` — stop all agents from invoking claude
- `/unfreeze` — resume
- `/reset` — clear the chain + spend ledger + **all agents' memory** + downloaded attachments

**Per-agent** (address the specific bot you mean, e.g. `@head-of-trading /stop` — a bare `/stop` with no mention targets the default recipient, `ceo`):

- `/stop` — cancel that agent's **in-flight** turn immediately. Bypasses the FIFO queue entirely (that's the point — it doesn't wait behind the running task), so it works even mid-task. If nothing is running, it just says so.
- `/redirect <new instructions>` — same as `/stop`, but immediately starts a fresh turn with the new instructions instead of just cancelling. The agent's session memory is untouched, so it still has the interrupted task in context (told explicitly that it was interrupted) — it just isn't allowed to keep working on it. If nothing was running, this behaves like a normal message.

Ordinary messages sent while an agent is mid-task are unaffected by either of these — they still queue normally and run after the current turn finishes, exactly as before. `/stop`/`/redirect` are the only way to jump the queue.

## Background jobs (long-running work)

**Why this exists:** a head's turn runs as one disposable `claude --print` process
(see "How it works" above). If that turn dispatches a specialist via the Task
tool's background mode and then wraps up its own reply, the whole process exits
— and anything still running inside it, including that "background" subagent,
dies with it. There's also nothing left alive to receive a completion
notification later. This showed up for real: specialist sessions got killed
mid-work by the parent turn exiting, and a "background" ping actually meant
"the process was killed," not "the task finished."

The fix: heads are instructed (see `adl/prompts/<head>.md`) to dispatch
specialists **synchronously** by default — the head's own Discord reply, posted
when the turn ends, already is the completion ping.

For work that's genuinely too long for one turn, a head ends its reply with a
job marker instead of faking a background dispatch:

```
[[JOB agent=quant-researcher]]
Backtest the funding-basis strategy across the last 3 regimes with realistic
fees/slippage (issue #27). Report Sharpe, drawdown, and known biases.
[[/JOB]]
```

`agent-runner.js` — not the model, and not the ephemeral `claude` subprocess —
supervises this, because it's the one thing in this stack that's actually
long-lived (kept alive by pm2 across every turn):

1. Strips the marker from the visible reply before posting it.
2. Opens a **Discord thread** off that message (`quant-researcher: backtest funding-basis…`).
3. Spawns `quant-researcher` as its own independent `claude --print --agent quant-researcher`
   process — a sibling top-level invocation the runner owns directly, not a
   Task-tool subagent nested inside the dispatching head's (already-finished) turn.
4. When that process closes — seconds or hours later, doesn't matter — posts
   its result into the thread.
5. Resumes the dispatching head's own session so it reacts normally (QA, open
   a PR, update memory), and posts that reply to the same thread too. Only a
   **bounded summary** of the job's result goes into that resumed session — not
   the full reply (see "Summary blocks" below) — so a long chain of jobs
   doesn't balloon the head's permanent context turn over turn.

Jobs share the same concurrency cap (`MAX_CONCURRENCY`) and spend ledger as
normal turns, and get their own timeout (`JOB_TIMEOUT_MINUTES`, default 180 —
separate from `CLAUDE_TIMEOUT_MINUTES`, which is for normal chat turns).

**Chaining jobs from a job's own follow-up turn.** Step 5 above is a real
turn — the head can end *that* reply with another `[[JOB agent=...]]` marker
too (e.g. "backtest finished, now dispatch execution-engineer to build the
connector"), and the runner parses and dispatches it exactly like it does for
a normal channel turn (fixes issue #1, where this marker used to get posted to
Discord as literal text and no job ever started). A chained job:

- **Lands in the same thread** — no new thread is opened, so the whole trail
  (research → build → review) stays coherent in one place.
- **Is capped at a chain depth of `MAX_JOB_CHAIN_DEPTH`** (12, beyond the
  original job — bumped from 3 on 2026-08-31 since a real multi-task build
  phase runs research→build→(fix→review)→deploy→next-task serially) — the
  runner refuses to start a chained dispatch past that and instead pings the
  founder in the thread to take it from there, so a head can't accidentally
  loop jobs forever.

**Summary blocks — keeping chained jobs from ballooning context.** Every
specialist job's system prompt (set in `runSpecialistJob`) asks the specialist
to end its reply with a `[[SUMMARY]]...[[/SUMMARY]]` block: a short,
self-contained recap (verdict, file paths, PR/issue numbers — whatever the
dispatching head will need). The runner strips that block before posting the
full reply to the thread, then feeds *only the block's contents* back into the
dispatching head's resumed session in step 5 above — not the full reply. Since
a resumed session's history only ever grows until `/reset`, folding in a whole
backtest write-up + connector diff + risk review on every job in a 12-deep
chain would otherwise make context balloon fast. If a specialist omits the block (an older
prompt, or it just forgot), the runner falls back to the last ~1200 characters
of its reply — the tail, since verdicts are usually written last — rather than
losing the fallback context entirely.

**Known limitations (v1):** one job per turn (chaining is sequential — you
can't fan out two independent chains from the same reply); `/stop` cancels the
current foreground turn only, not a running job (kill the pm2 process if you
need to abort one); the founder can read a job's thread but replying in it
won't address the head bot (thread messages aren't in the watched channel) —
talk to the head in the main channel instead.

> This is a runtime-only change (no config/schema change) — same as any other
> edit to `agent-runner.js`, it requires `pm2 restart all` to take effect;
> there's no hot reload (see "Configuring agent models" below for the same
> caveat applied elsewhere in this file).

## MCP servers

The repo-root `.mcp.json` (`github`, `discord`) is loaded for **MCP-enabled
agents only**. `claude --print` ignores `.mcp.json` unless it's passed
explicitly, so at startup the runner:

1. Reads `<repo-root>/.mcp.json` (if absent, nothing happens — no MCP, as before).
2. Resolves every `${VAR}` in it from the runner's own env (the same `.env` the
   runner already loads). This is required because Claude only interpolates
   `${VAR}` for a stdio server's `env` block, **not** for an http server's
   `headers` — an unresolved `${VAR}` (env var missing) is left as-is and
   logged with the server name.
3. Writes the resolved JSON to a private per-agent file in the OS temp dir
   (`<company-dir>-agent-mcp-<AGENT_NAME>.json`, mode `0600`, rewritten each
   startup — namespaced by this repo's directory name so two companies on one
   machine don't collide, same as the pm2 process names) —
   never inside the repo, so the resolved secret is never at risk of a commit.
4. Passes `--mcp-config <that file> --strict-mcp-config` to `claude --print`
   **only** for MCP-enabled agents.

The committed `.mcp.json` is never modified — it keeps its `${VAR}` placeholders,
so no secret is in git.

**Which agents get MCP:** `roster.json` entries with a non-empty `"mcp"` array
(compiled from `capabilities.mcp` in the agent's ADL spec). None of the current
crypto-desk roles declare one, so this mechanism is currently dormant — add
`capabilities.mcp` to a role's ADL spec and recompile to enable it for that
agent. Everyone else (`ceo`, the heads, and every specialist) runs exactly as
before — their `claude` args are unchanged.

**Runtime-only change** — like any edit to `agent-runner.js` / `roster.json`, it
needs `pm2 restart all` to take effect (no hot reload). Adding a server to
`.mcp.json`, or adding `capabilities.mcp` to another agent's ADL spec (then
`npm run build` in `adl/`), also needs a restart.

## Configuring agent models

The model is set in **different places depending on how the agent runs** — that's
why you may see it in more than one file.

| Where | Sets the model for… | Mechanism |
|---|---|---|
| **`roster.json`** (`model` field) | The **5 bots** (`ceo` + 4 heads) when running as Discord agents | passed as `claude --model` by the runner |
| **`.claude/agents/<name>.md`** (frontmatter `model:`) | The **7 specialists** (`trader`, `quant-researcher`, `execution-engineer`, `compliance-officer`, `treasury-manager`, `accountant`, `legal-counsel`) when invoked as `Task`-tool subagents inside a head's turn | read by Claude Code for the subagent |
| **`.claude/settings.json`** (`model`) | Global session default | interactive Claude Code + the legacy `discord-bridge` |

**Precedence for a head running as a bot:** `roster.json` → overrides its `.md`
frontmatter → overrides `settings.json`. So for this Discord system,
**`roster.json` is the source of truth for the 5 heads.**

In practice:

- **Change a head/CEO bot's model** → edit `roster.json`, then `pm2 restart all`.
  No `.md` or code change needed.
- **Change a specialist's model** (they're never bots) → edit that agent's `.md`
  frontmatter `model:`.
- **Tip:** keep each head's `.md` frontmatter in sync with its `roster.json`
  entry even though roster wins — then the value is identical no matter how the
  agent is invoked (bot vs. Task vs. legacy bridge).

Valid values: an alias (`opus`, `sonnet`, `haiku`) or a full id
(`claude-opus-4-8`). Default everything to `sonnet`; reserve `opus` for genuinely
ambiguous strategic calls and `haiku` for mechanical/bulk specialist work.

## Memory

Each agent keeps its **own resumable Claude session** so it remembers your prior
turns. On the first turn a session is created; the runner stores its `session_id`
in `.discord-agents/sessions.json` and passes `--resume <id>` on every later turn.

- **Private, not shared.** An agent remembers *its own* past turns in full, but it
  does **not** see the founder's conversations with other agents — agents only
  learn about each other through what's posted in the channel (`@mentions`).
- **Context grows each turn → more tokens.** This is the cost trade-off of memory.
  When a thread gets long or goes stale, run **`/reset`** — it clears every
  agent's memory (and the chain + spend ledger) so they start fresh.
- **Survives restarts.** Session ids are on disk, so `pm2 restart all` keeps memory.
- **Turn off** with `AGENT_MEMORY=off` in `.env` (then `pm2 restart all`) to go
  back to cheap, stateless turns where each message is answered in isolation.

If a stored session goes missing on disk, the runner logs it and transparently
starts a fresh one for that agent.

**Watching context size.** Each turn's result reports token usage; the runner
stores an approximation of the resumed session's current size (cache-read +
cache-creation + input tokens for that turn) alongside its session id in
`.discord-agents/sessions.json`. `/status` prints it per agent, flagging
anything over 120K tokens (`⚠️`) — there's no automatic reset on this, it's
purely a visibility cue for deciding when an agent's session is due for a
`/reset`.

## Logging

Two levels. After changing the env, `pm2 restart all` and `pm2 logs` (see
"Running with pm2" for the full command list).

**1. Lifecycle (always on).** Each turn prints a concise start/end line:

```
[ceo] ▶ turn from the founder: "ship the QR feature"
[ceo] ✓ done in 12.4s · $0.0153
```

**2. Steps (opt-in:** `LOG_AGENT_STEPS=1`**).** Also streams the agent's thinking
and tool calls as they happen (uses `--output-format stream-json` internally):

```
[ceo] ▶ turn from the founder: "ship the QR feature"
[ceo]   🔧 Read({"file_path":"company/memory/BRIEF.md"})
[ceo]   💭 Routing this to engineering...
[ceo]   🔧 Bash({"command":"gh issue list"})
[ceo] ✓ done in 18.1s · $0.0421
```

Leave step logging **off** for normal running (less noise); flip it on to debug
an agent's behavior.

**Notes**
- An **idle agent prints nothing** until it's `@mentioned` — that's by design
  (mention-gated = no wasted tokens). Empty logs ≠ broken; check `pm2 list` for
  `online` status.
- `pm2 monit` only streams *new* lines for the selected process and doesn't
  replay history — use `pm2 logs --lines N` to see the startup banners.
- Errors (non-zero exit, timeouts, usage limits) always log via stderr →
  `pm2 logs <name> --err`.

## Cost model (why this stays cheap)

- **Mention-gated:** an agent spends tokens *only* when actually addressed. Idle channel = zero `claude` processes.
- **Bounded context:** agents read the condensed `company/memory/BRIEF.md` instead of the full `COMPANY.md`, and durable handoffs live in GitHub issues + `company/` files rather than the context window. (Per-agent memory is on — see "Memory" — which does grow context per turn; `/reset` wipes it.)
- **Sonnet** for every agent (see `roster.json`); Opus only on explicit escalation.
- **Hop budget + concurrency cap** bound the worst case; the spend ledger posts a reminder at the limit (manual `/freeze` to stop).

## Growing the roster later

Everything is data-driven. To make a specialist its own bot, create its Discord
app, add a row to `roster.json` (`name`, `tokenEnv`, `model`), add the token to
`.env`, and `pm2 restart all`. No code changes.

## Known limitations

- `claude --bare` (the cheapest context mode) is **not** used: it requires an
  `ANTHROPIC_API_KEY` and ignores the OAuth/keychain login this setup relies on.
  We get cost savings the other ways listed above instead.
- The shared-state lockfile is single-host and best-effort; fine for one founder
  + a handful of bots, not for high-concurrency use.
