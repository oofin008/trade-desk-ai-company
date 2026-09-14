# AI Crypto Trading Desk — Discord Multi-Agent Company

A **multi-agent AI crypto trading desk running in a single Discord channel**, driven by Claude
Code. One human founder steers; a CEO + four office-head bots (Front Office, Middle Office,
Back Office, Cross-cutting) and their specialist subagents do the work. The org structure is
drawn from `crypto-desk-roles.html`'s 11-role desk role book.

This repo ships with the **org structure defined but the business details still blank**. Run
**`/scaffold-company`** and the `init` agent interviews you and fills in the rest (capital base,
venues, risk limits, jurisdictions, budgets) so you can stand up the desk in minutes.

## Quick start

```bash
# 1. Copy this template somewhere as your new company, then open Claude Code in it:
claude

# 2. Scaffold your company (the init agent will interview you):
/scaffold-company a discretionary spot/perp desk trading majors on 2-3 CEX venues
#   ^ the trailing text is optional seed context; you can also run /scaffold-company with no args
```

The `init` agent then writes `company/memory/COMPANY.md`, `BRIEF.md`, the office
`CLAUDE.md`s, `BUDGET.md`, and seeds the decision log — and prints the remaining manual setup
(Discord bots, tokens, GitHub labels).

## What's in here

```
trade-desk-ai-company/
├── CLAUDE.md                          # Top-level operating manual (hard rules, Discord protocol)
├── README.md                          # This file
├── crypto-desk-roles.html             # Source role book — 11 roles, 4 offices (reference doc)
├── adl/                              # Agent Definition Language — SOURCE OF TRUTH for agents
│   ├── agents/*.adl.yaml             #   13 declarative specs (edit these)
│   ├── prompts/*.md                  #   system-prompt bodies (edit these)
│   ├── schema/agent.schema.json      #   the spec contract (JSON Schema)
│   ├── backends/claude-code.mjs      #   compiles specs → .claude/agents + roster.json
│   └── validate.mjs · compile.mjs    #   `npm run build` in adl/  (see adl/README.md)
├── .claude/
│   ├── settings.json                  # Permissions, spend limits, allowed/denied tools
│   ├── agents/                        # 13 agents — GENERATED from adl/, do not hand-edit
│   │   ├── init.md                ←  scaffolds a fresh company (run /scaffold-company)
│   │   ├── ceo.md
│   │   ├── head-of-trading.md     →  trader, quant-researcher, execution-engineer
│   │   ├── risk-manager.md        →  compliance-officer
│   │   ├── head-of-operations.md  →  treasury-manager, accountant
│   │   └── security-engineer.md   →  legal-counsel
│   ├── commands/                      # /scaffold-company, /standup, /directive, /review-queue
│   └── skills/                        # 12 role playbooks (plain files — not ADL-generated)
├── .github/workflows/                 # Auto-route issues, setup labels
├── .mcp.json                          # GitHub + Discord MCPs
├── company/                           # ← all BLANK placeholders until you scaffold
│   ├── memory/{COMPANY.md, BRIEF.md, ACTIVITY.md}
│   ├── decisions/LOG.md
│   └── BUDGET.md
├── departments/
│   ├── front-office/CLAUDE.md         # ← blank venues/instruments/stack
│   ├── middle-office/CLAUDE.md        # ← blank risk limits/jurisdictions
│   ├── back-office/CLAUDE.md          # ← blank venues/banking rails
│   └── cross-cutting/CLAUDE.md        # ← blank custody/entity setup
└── scripts/
    ├── discord-agents/                # Each agent is its own bot in one channel (preferred)
    │   ├── agent-runner.js            #   one long-lived process per bot (pm2); supervises jobs
    │   └── lib/{jobs,mcp-config}.js   #   [[JOB]] markers · ${VAR}-resolved MCP config (+ tests)
    └── discord-bridge/                # Legacy single-driver bridge (fallback)
```

## The agents

**Scaffolder (1):** `init` — interviews you and fills in the company. Run via `/scaffold-company`.

**Orchestrator (1):** `ceo` — routes between offices, maintains memory.

**Office heads (4):** `head-of-trading` (Front Office), `risk-manager` (Middle Office — reports
independently to the founder/board, not the desk), `head-of-operations` (Back Office),
`security-engineer` (Cross-cutting).

**Specialists (7):**
- Front Office: `trader` (works orders), `quant-researcher` (signal research/backtesting),
  `execution-engineer` (exchange connectivity, execution infra)
- Middle Office: `compliance-officer` (KYC/AML, licensing, sanctions screening)
- Back Office: `treasury-manager` (capital allocation, liquidity), `accountant` (ledger, tax, audit prep)
- Cross-cutting: `legal-counsel` (entity structure, agreements, regulatory classification)

## Agent definitions (ADL)

Agents are **not** defined by hand-editing `.claude/agents/*.md`. They're defined declaratively
in **`adl/`** (the Agent Definition Language) and *compiled* into the runtime files:

| You edit | It generates |
| --- | --- |
| `adl/agents/<name>.adl.yaml` — model, tools, department, mention contract | `.claude/agents/<name>.md` frontmatter |
| `adl/prompts/<name>.md` — the system prompt | `.claude/agents/<name>.md` body |
| all specs with `surface: bot` | `scripts/discord-agents/roster.json` |

```bash
cd adl
npm install          # first time
npm run build        # validate specs + regenerate artifacts
npm run check        # verify artifacts are in sync (CI runs this)
```

Commit the specs **and** the regenerated artifacts together. `.github/workflows/adl.yml` fails
the build if they drift, and the artifacts are marked `linguist-generated`. Full reference:
**`adl/README.md`**.

## Read order — what an agent follows, highest priority first

Every turn resolves through the same stack. Higher layers constrain or override lower ones:

1. **`.claude/settings.json`** — harness-enforced permissions, spend limits, model default. Not optional; the CLI enforces it regardless of what an agent decides.
2. **Root `CLAUDE.md`** — hard rules (draft-don't-ship, reversible-only, stay-in-lane, update memory, log decisions, log activity). Explicitly overrides default behavior.
3. **ADL specs → compiled artifacts** — `adl/agents/<name>.adl.yaml` + `adl/prompts/<name>.md` are the source of truth; `adl/backends/claude-code.mjs` compiles them into `.claude/agents/<name>.md` (what Claude Code actually loads for `--agent <name>`) and `scripts/discord-agents/roster.json`. CI fails the build on drift, so this is a strict one-way pipeline — never hand-edit the generated files.
4. **Each agent's own "Read first" list** — every compiled `.claude/agents/<name>.md` prescribes its own order, typically: root `CLAUDE.md` → `company/memory/COMPANY.md` → its `departments/<dept>/CLAUDE.md`.
5. **Company memory** — `company/memory/BRIEF.md` (short-form, read by default for cost discipline) before the full `COMPANY.md`; plus `ACTIVITY.md` (append-only feed) and `company/decisions/LOG.md` (append-only decisions) and `company/BUDGET.md` (checked before recommending spend).
6. **Department `CLAUDE.md`** — role-specific conventions and stack (`departments/<dept>/CLAUDE.md`).
7. **Skills** (`.claude/skills/<name>/SKILL.md`) — step-by-step playbooks invoked on demand for *how* to do a piece of work. They encode the hard rules above, they don't override them.
8. **Per-turn Discord preamble** — `scripts/discord-agents/agent-runner.js` appends a `--append-system-prompt` at invocation time (bot identity, mention/peer list, hop-budget note, "read BRIEF.md first"). This is layered in last, so it's the final word for that specific turn.

GitHub Issues (`dept:*` / `status:*` labels) sit outside this stack as the durable record of cross-department handoffs — Discord mentions are live coordination, issues are what persists.

## Setup (one-time)

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Scaffold the company
Run `claude`, then `/scaffold-company`. Answer the interview. This fills the `company/` and
`departments/` files. (You can always edit them by hand afterward.)

### 3. Set environment variables
Copy `.env.example` → `.env` and fill it in. At minimum you need `GITHUB_TOKEN`. For the
multi-agent Discord system you also need one bot token per agent — see
`scripts/discord-agents/README.md`.

### 4. Set up your GitHub repo labels
```bash
gh workflow run setup-labels.yml      # creates dept + status labels. Run once.
```

### 5. Run the Discord agents (optional but recommended)
```bash
cd scripts/discord-agents && npm install
npm start                              # all agents in one terminal (testing)
# production (persistent): see scripts/discord-agents/README.md → "Running with pm2"
```

## Daily usage

From the repo, run `claude` to start a session.

### Commands
- **`/scaffold-company [idea]`** — (re)initialize the company memory via the `init` agent
- **`/standup`** — daily status across offices
- **`/directive [your goal]`** — give the CEO something to plan and route
- **`/review-queue`** — see everything pending human approval

### Discord
Each agent is its own bot in one shared channel. Address one with `@ceo` / `@head-of-trading`;
it replies as itself and hands off to peers by `@mention`.

Founder controls — **global** (any agent acks): `/status` (hops, spend, frozen, per-agent context
size), `/freeze`, `/unfreeze`, `/reset`. **Per-agent** (address the bot you mean, e.g.
`@head-of-trading /stop`): `/stop` cancels that agent's in-flight turn, `/redirect <instructions>`
cancels it and immediately starts a fresh turn with new instructions. Both jump the queue; ordinary
messages still wait their turn.

**Background jobs.** A turn is one disposable `claude --print` process, so a head that "backgrounds"
a specialist and then finishes its reply kills that work instead of delivering it. For work too long
for one turn, a head ends its reply with `[[JOB agent=trader]]…[[/JOB]]`; `agent-runner.js` (long-lived
under pm2, unlike the turn) opens a Discord thread, runs that specialist as its own top-level
invocation, posts the result, then resumes the head's session so it reacts normally — review,
approve, update memory. Chained jobs stay in the same thread, capped at `MAX_JOB_CHAIN_DEPTH`.

Full details in `scripts/discord-agents/README.md`.

## The non-negotiable rules

Every agent follows these (they live in root `CLAUDE.md`):
1. **Draft, don't ship.** No publishing, sending, deploying, or charging without explicit human approval.
2. **Reversible only.** Irreversible action → stop and ask.
3. **Stay in lane.** Cross-office work goes through the CEO.
4. **Update memory.** Learnings worth keeping go in `COMPANY.md`.
5. **Log decisions.** Strategic decisions go in `decisions/LOG.md`.

## Cost discipline

- **Spend limits** in `.claude/settings.json` (session/daily/monthly). Adjust to your appetite.
  ⚠️ Field names for spend limits can vary by Claude Code version — check the docs if the
  schema is rejected.
- **Model defaults:** everything on **Sonnet**. **Opus** only on explicit escalation (e.g. a
  genuinely ambiguous risk or strategy call). Set a role's model in its `adl/agents/<name>.adl.yaml`
  (`runtime.model`), recompile, and log why in `decisions/LOG.md` — don't hand-edit `roster.json`.
- The Discord runner adds a hop budget, concurrency cap, and a spend ledger that auto-freezes —
  see `scripts/discord-agents/README.md`.

## Verification (worth doing before relying on this)
- Check the current shape of `.claude/settings.json` against the Claude Code docs (the spend-limit
  and permissions fields evolve).
- Confirm the GitHub MCP server name in `.mcp.json` matches what's published.
- The Discord MCP (`mcp-discord`) is a community package — confirm it's maintained or swap one you trust.

## What to build next

Once this is humming, consider: wiring real order placement behind human approval gates (still
never auto-live); a dedicated on-call/incident agent once real capital is at risk; MCPs for
exchange APIs, a data warehouse, or a custody provider when you graduate from drafts and
paper-trading to signed-off live flows. Don't add these until you've felt the pain of not having
them.
