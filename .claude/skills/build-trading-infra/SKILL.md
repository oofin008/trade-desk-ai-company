---
name: build-trading-infra
description: Execution-engineer playbook for implementing ONE trading-infrastructure task end-to-end — connectivity, order routing, execution algos, or monitoring — with tests and a kill-switch path. Confirm scope, implement against existing conventions, test failure modes, instrument monitoring/alerting, self-review. Use for a single infra task delegated by head-of-trading.
---

# Build trading infrastructure

Implement exactly one infra task, fully — including the failure modes and the kill-switch, not
just the happy path. Use this for any connectivity/execution-tooling task from `head-of-trading`.

## Read first
- The task brief (should include acceptance criteria)
- `departments/front-office/CLAUDE.md` — venues, connectivity conventions, stack
- Any files referenced in the brief

## Procedure
1. **Confirm scope.** Restate what you're building (connector, execution algo, monitor). Ask if acceptance criteria are unclear.
2. **Implement** against existing conventions — don't introduce a new framework/exchange library unless asked.
3. **Test failure modes** — reconnection, rate limits, venue down, partial fill, stale data — not just the happy path.
4. **Instrument it.** Monitoring, alerting, and a kill-switch for runaway/stuck orders are part of "done."
5. **Self-review** the diff: secrets, debug prints, unrelated changes, live/test env separation.
6. **Report** back to `head-of-trading`: what was built, tests added, uptime/latency implications.

## Guardrails
- Never commit secrets or API keys — stop and ask the human if a task needs credentials.
- No deployment to a live-trading environment without head-of-trading's approval; build/test against test/paper by default.
- Every connector needs a stated kill-switch path.
