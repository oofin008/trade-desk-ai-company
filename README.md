# AI Company — Discord Multi-Agent Template

A reusable template for running a **multi-agent AI company in a single Discord channel**,
driven by Claude Code. One human founder steers; a CEO + four department-head bots (Software,
Product, Marketing, Sales) and their specialist subagents do the work.

This repo ships **blank** — no product baked in. Run **`/scaffold-company`** and the `init`
agent interviews you and fills in everything (company memory, departments, budgets) so you can
stand up a fresh AI company in minutes.

## Quick start

```bash
# 1. Copy this template somewhere as your new company, then open Claude Code in it:
claude

# 2. Scaffold your company (the init agent will interview you):
/scaffold-company a tool that helps freelance designers invoice clients
#   ^ the trailing text is optional seed context; you can also run /scaffold-company with no args
```

The `init` agent then writes `company/memory/COMPANY.md`, `BRIEF.md`, the department
`CLAUDE.md`s, `BUDGET.md`, and seeds the decision log — and prints the remaining manual setup
(Discord bots, tokens, GitHub labels).

## What's in here

```
ai-company-template/
├── CLAUDE.md                          # Top-level operating manual (hard rules, Discord protocol)
├── README.md                          # This file
├── adl/                              # Agent Definition Language — SOURCE OF TRUTH for agents
│   ├── agents/*.adl.yaml             #   14 declarative specs (edit these)
│   ├── prompts/*.md                  #   system-prompt bodies (edit these)
│   ├── schema/agent.schema.json      #   the spec contract (JSON Schema)
│   ├── backends/claude-code.mjs      #   compiles specs → .claude/agents + roster.json
│   └── validate.mjs · compile.mjs    #   `npm run build` in adl/  (see adl/README.md)
├── .claude/
│   ├── settings.json                  # Permissions, spend limits, allowed/denied tools
│   ├── agents/                        # 14 agents — GENERATED from adl/, do not hand-edit
│   │   ├── init.md                ←  scaffolds a fresh company (run /scaffold-company)
│   │   ├── ceo.md
│   │   ├── head-of-software.md    →  dev, qa
│   │   ├── head-of-product.md     →  researcher, analyst
│   │   ├── head-of-marketing.md   →  copywriter, designer, analyst
│   │   └── head-of-sales.md       →  sdr (outbound), ae (inbound)
│   ├── commands/                      # /scaffold-company, /standup, /directive, /review-queue
│   └── skills/                        # 17 role playbooks (plain files — not ADL-generated)
├── .github/workflows/                 # Auto-route issues, setup labels
├── .mcp.json                          # GitHub + Discord MCPs
├── company/                           # ← all BLANK placeholders until you scaffold
│   ├── memory/{COMPANY.md, BRIEF.md, ACTIVITY.md}
│   ├── decisions/LOG.md
│   └── BUDGET.md
├── departments/
│   ├── software/CLAUDE.md             # ← blank stack
│   ├── product/{CLAUDE.md, SPEC_TEMPLATE.md}
│   ├── marketing/CLAUDE.md            # ← blank channels
│   └── sales/{CLAUDE.md, PIPELINE.md}
└── scripts/
    ├── discord-agents/                # Each agent is its own bot in one channel (preferred)
    └── discord-bridge/                # Legacy single-driver bridge (fallback)
```

## The agents

**Scaffolder (1):** `init` — interviews you and fills in the company. Run via `/scaffold-company`.

**Orchestrator (1):** `ceo` — routes between departments, maintains memory.

**Department heads (4):** `head-of-software`, `head-of-product`, `head-of-marketing`, `head-of-sales`.

**Specialists (8):**
- Software: `dev` (writes code), `qa` (reviews diffs, catches bugs)
- Product: `researcher` (qualitative), `analyst` (quantitative — shared with marketing)
- Marketing: `copywriter` (text), `designer` (HTML/SVG mockups), `analyst` (shared)
- Sales: `sdr` (outbound, Haiku for volume), `ae` (inbound, qualifying warm leads)

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
- **`/standup`** — daily status across departments
- **`/directive [your goal]`** — give the CEO something to plan and route
- **`/review-queue`** — see everything pending human approval

### Discord
Each agent is its own bot in one shared channel. Address one with `@ceo` / `@head-of-software`;
it replies as itself and hands off to peers by `@mention`. Founder controls: `/status`,
`/freeze`, `/unfreeze`, `/reset`. Full details in `scripts/discord-agents/README.md`.

## The non-negotiable rules

Every agent follows these (they live in root `CLAUDE.md`):
1. **Draft, don't ship.** No publishing, sending, deploying, or charging without explicit human approval.
2. **Reversible only.** Irreversible action → stop and ask.
3. **Stay in lane.** Cross-department work goes through the CEO.
4. **Update memory.** Learnings worth keeping go in `COMPANY.md`.
5. **Log decisions.** Strategic decisions go in `decisions/LOG.md`.

## Cost discipline

- **Spend limits** in `.claude/settings.json` (session/daily/monthly). Adjust to your appetite.
  ⚠️ Field names for spend limits can vary by Claude Code version — check the docs if the
  schema is rejected.
- **Model defaults:** everything on **Sonnet**; **Haiku** for `sdr`/`qa` (volume/lower stakes);
  **Opus** only on explicit escalation. Set a role's model in its `adl/agents/<name>.adl.yaml`
  (`runtime.model`), recompile, and log why in `decisions/LOG.md` — don't hand-edit `roster.json`.
- The Discord runner adds a hop budget, concurrency cap, and a spend ledger that auto-freezes —
  see `scripts/discord-agents/README.md`.

## Verification (worth doing before relying on this)
- Check the current shape of `.claude/settings.json` against the Claude Code docs (the spend-limit
  and permissions fields evolve).
- Confirm the GitHub MCP server name in `.mcp.json` matches what's published.
- The Discord MCP (`mcp-discord`) is a community package — confirm it's maintained or swap one you trust.

## What to build next

Once this is humming, consider: wiring real deployment behind human approval gates; a Customer
Success agent once you have customers; a Finance agent projecting burn from `BUDGET.md` +
revenue from `PIPELINE.md`; MCPs for your CRM/email/calendar when you graduate from drafts to
sending. Don't add these until you've felt the pain of not having them.
