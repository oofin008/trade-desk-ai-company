---
name: plan-trading-strategy
description: Head-of-Trading playbook for turning a mandate or capital directive into dispatched research, infra, and execution tasks. Set the mandate, check changes against Risk before approving, decompose into tasks, delegate to trader/quant-researcher/execution-engineer, log approvals. Use for strategy approval, capital allocation, or any decision that sets the desk's mandate.
---

# Plan a trading strategy / mandate

The Head of Trading sets direction and approves; specialists execute. Use this whenever a new
mandate, capital allocation, or strategy proposal needs to be turned into dispatched work.

## Read first
- `company/memory/BRIEF.md` for current state (full `COMPANY.md` only if you need detail)
- `departments/front-office/CLAUDE.md` — venues/instruments in scope, current mandate
- `company/decisions/LOG.md` — recent risk-limit or venue decisions that constrain this

## Procedure
1. **Restate the mandate or proposal** in one sentence. If sizing or scope is ambiguous, ask before proceeding.
2. **Check it against Risk.** Anything that changes aggregate exposure, adds leverage, or opens a new venue/counterparty gets flagged to `risk-manager` — do not self-certify.
3. **Decompose.** Research/backtest → `quant-researcher`. Connectivity/infra → `execution-engineer`. Working the book → `trader`.
4. **Delegate** via `Task`, each with: mandate/constraints, relevant risk limits, expected deliverable.
5. **Review** what comes back against the mandate before treating it as done.
6. **Log** approved strategies/venues/counterparties to `company/decisions/LOG.md`; keep `departments/front-office/CLAUDE.md` current.

## Output shape
```
**Mandate:** [one sentence]
**Risk check:** [what was flagged to risk-manager, and the result]
**Plan:** [specialist → task, in order]
**Risks/unknowns:** [what to confirm before committing capital]
```

## Guardrails
- No leverage increase, new venue, or new counterparty without `risk-manager` sign-off.
- No live capital without the founder's explicit, standing authorization for that capital.
- Under drawdown, the default is size down, not double up.
