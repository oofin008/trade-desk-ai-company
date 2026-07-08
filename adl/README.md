# ADL — Agent Definition Language

`adl/` is the **single source of truth** for every agent in this company. Agents are
described as declarative, schema-validated YAML specs and *compiled* into the concrete
files the runtime reads. You edit specs; you never hand-edit the generated artifacts.

```
adl/
  schema/agent.schema.json     JSON Schema (draft 2020-12) for an agent spec
  agents/<name>.adl.yaml        one spec per agent  ← EDIT THESE
  prompts/<name>.md             system-prompt body for each agent  ← EDIT THESE
  backends/claude-code.mjs      the ONLY Claude-Code-specific code
  validate.mjs  compile.mjs  migrate.mjs  cli.mjs
```

## Generated artifacts (do not edit by hand)

| Generated file | Source |
| --- | --- |
| `.claude/agents/<name>.md` | `agents/<name>.adl.yaml` + `prompts/<name>.md` |
| `scripts/discord-agents/roster.json` | all specs with `runtime.surface: bot` |

`scripts/discord-agents/ecosystem.config.cjs` is **not** generated — it already derives
its pm2 process list from `roster.json` at load time.

## Workflow

```bash
cd adl
npm install          # first time only
npm run validate     # JSON Schema + cross-reference lint
npm run compile      # regenerate the artifacts above
npm run check        # verify artifacts match the specs (no write) — CI runs this
npm run build        # validate && compile
```

Change an agent → edit its `.adl.yaml` and/or its `prompts/*.md` → `npm run build` →
commit **both** the specs and the regenerated artifacts. CI (`.github/workflows/adl.yml`)
fails the build if the committed artifacts don't match the specs.

## The spec

See `schema/agent.schema.json` for the authoritative contract. In brief:

```yaml
apiVersion: adl/v1
kind: Agent
metadata:
  name: head-of-software        # kebab-case; must match the filename
  department: software          # company | product | software | marketing | sales
  tier: head                    # ceo | head | specialist
  description: Engineering lead… # emitted verbatim as the runtime description
runtime:
  model: sonnet                 # logical tier: haiku | sonnet | opus | fable
  surface: bot                  # bot (own Discord identity) | subagent (Task tool)
  tokenEnv: DISCORD_TOKEN_SOFTWARE   # bots only
capabilities:
  tools: [Read, Write, Edit, Bash, Glob, Grep, Task]
interaction:
  canMention: [head-of-product, ceo]   # @mention hand-off contract (bots)
  handoffVia: github-issue
guardrails:
  draftsOnly: true
  inherits: [company-hard-rules]
prompt:
  body: prompts/head-of-software.md
```

`runtime.model` is a **logical tier**; `backends/claude-code.mjs` maps it to a concrete
model id, so specs stay portable and the whole company's tier policy lives in one table.

## Validation rules (beyond the schema)

- filenames match `metadata.name`; names are unique
- `surface: bot` ⇒ `tokenEnv` required; `surface: subagent` ⇒ no token, not default
- `tier: specialist` ⇔ `surface: subagent` (coherence)
- every `interaction.canMention` target resolves to a known agent (and never itself)
- every `prompt.body` file exists
- exactly one bot is `default: true`

## Adding an agent

1. `adl/agents/<name>.adl.yaml` — write the spec.
2. `adl/prompts/<name>.md` — write the system prompt.
3. `npm run build`, commit specs + generated files.

## Porting to another runtime

Add a backend module exporting `render(specs) -> [{ path, contents }]` and point
`compile.mjs` at it. The specs and validator are runtime-agnostic; only the backend
knows about Claude Code.
