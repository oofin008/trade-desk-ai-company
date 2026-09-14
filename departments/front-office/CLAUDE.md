# Front Office

> ⚠️ Fill in the stack, venues, and instruments below via **`/scaffold-company`** or by editing directly.

## What this office owns
- Strategy: research, backtesting, and approving trading signals
- Execution: working orders, managing inventory and hedges
- Trading infrastructure: exchange connectivity, order routing, execution tooling

## What it does NOT own
- Risk limits and leverage sign-off (Middle Office owns this — Risk is independent of the desk)
- Fund movement and custody operations (Back Office owns this)
- Key management and custody architecture (Cross-cutting owns this)

## Mandate
- **Venues in scope:** <exchanges/venues the desk trades on>
- **Instruments in scope:** <spot / perps / options / other>
- **Instruments explicitly off-limits:** <anything the desk should not touch, and why>
- **Capital base:** <starting capital, or "TBD">

## Stack
- **Quant/research language:** <LANGUAGE>
- **Data feeds:** <market data, funding, on-chain sources>
- **Backtesting stack:** <framework/tooling>
- **Execution/connectivity:** <REST/WebSocket libraries, order-management layer>
- **Repo:** <REPO_URL> (local: <LOCAL_PATH>)

## Where things live
- `research/` — signal research and backtest write-ups from `quant-researcher`
- `trade-logs/` — fills and rationale, per `trader`'s workflow
- `strategy/` — approved strategy mandates and specs, owned by `head-of-trading`
- Active issues: GitHub Issues, label `dept:front-office`

## Conventions
- No live capital without the founder's explicit, standing authorization for that flow.
- Every approved strategy, venue, or counterparty gets logged to `company/decisions/LOG.md`.
- Nothing that changes aggregate exposure or adds leverage goes live without `risk-manager` sign-off.

## Acceptance criteria template (use in every issue)
```
**Goal:** [one sentence]
**Mandate/constraints:** [risk limits, venues, capital]
**Acceptance criteria:**
- [ ] [observable behavior — e.g. backtest result, deployed connector, executed fill log]
- [ ] Tests/validation added covering the above
**Out of scope:** [explicit non-goals]
**Related:** [links to prior strategy specs, related issues]
```
