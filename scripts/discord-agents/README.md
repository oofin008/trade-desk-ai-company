# Discord Agents — multi-agent company in one channel

Each agent (`ceo` + the four department heads) runs as its **own Discord bot** in
one shared channel. You address an agent with `@ceo` / `@head-of-software`, it
replies *as itself*, and it hands off to a peer by mentioning them — which is a
real ping that the peer's bot receives. **Discord is the message bus**; there is
no central router.

Specialists (`dev`, `qa`, `designer`, `analyst`, `researcher`, `copywriter`,
`sdr`, `ae`) are **not** bots — they still run as `Task`-tool subagents *inside*
the relevant head's invocation, exactly as before.

> Supersedes `scripts/discord-bridge/` (single-driver mode). Keep the old bridge
> around as a fallback during transition; retire it once this is validated.

## How it works

```
You: @head-of-software ship the QR payment feature
  head-of-software  (its bot runs `claude --print --agent head-of-software`)
    → spawns dev + qa via the Task tool internally (not separate bots)
    → posts: "Drafted PR #42. @ceo done, @head-of-marketing FYI for launch"
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

1. https://discord.com/developers/applications → **New Application** (name it e.g. `ceo`, `head-of-software`, …).
2. **Bot** → Reset Token → copy it. Enable **Message Content Intent**.
3. **OAuth2 → URL Generator** → scopes `bot`; permissions: `Send Messages`, `Read Message History`, `Add Reactions`. Open the URL and invite the bot into your server.
4. Set the bot's **username** to match its roster name (so `@name` autocompletes), or just type `@name` as plain text — the runner matches both.

All five bots join the **same channel**.

### Env (add to repo-root `.env`)

`.env.example` could not be auto-edited (it's covered by the repo's `.env*` write
deny rule) — add these manually:

```bash
# One token per agent (names match roster.json -> tokenEnv)
DISCORD_TOKEN_CEO=...
DISCORD_TOKEN_PRODUCT=...
DISCORD_TOKEN_SOFTWARE=...
DISCORD_TOKEN_MARKETING=...
DISCORD_TOKEN_SALES=...

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
`agent-head-of-software`, …), defined in `ecosystem.config.cjs`.

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
pm2 restart agent-software    # one agent
pm2 stop agent-sales          # stop without removing
pm2 delete all                # remove from pm2's list entirely
```

**Health check:** `pm2 list` — watch the restarts (`↺`) column. A climbing count
means an agent is crash-looping; `pm2 logs agent-<name>` shows why (usually a
missing `DISCORD_TOKEN_*` or the bot's Message Content Intent isn't enabled).

## Founder commands (type in the channel; only the `ceo` bot acks)

- `/status` — current hops, spend, frozen?
- `/freeze` — stop all agents from invoking claude
- `/unfreeze` — resume
- `/reset` — clear the chain + spend ledger + **all agents' memory** + downloaded attachments

## Configuring agent models

The model is set in **different places depending on how the agent runs** — that's
why you may see it in more than one file.

| Where | Sets the model for… | Mechanism |
|---|---|---|
| **`roster.json`** (`model` field) | The **5 bots** (`ceo` + 4 heads) when running as Discord agents | passed as `claude --model` by the runner |
| **`.claude/agents/<name>.md`** (frontmatter `model:`) | The **8 specialists** (`dev`, `qa`, `designer`, `analyst`, `researcher`, `copywriter`, `sdr`, `ae`) when invoked as `Task`-tool subagents inside a head's turn | read by Claude Code for the subagent |
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
