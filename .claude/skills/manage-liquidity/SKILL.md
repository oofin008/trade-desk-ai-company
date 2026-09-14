---
name: manage-liquidity
description: Treasury playbook for allocating capital across venues and forecasting liquidity within Risk's exposure caps. Check the cap before proposing, model the allocation/forecast with numbers, flag counterparty risk on parked balances, recommend (never execute) to head-of-operations. Use for capital-allocation or liquidity-planning tasks delegated by head-of-operations.
---

# Manage liquidity / allocate capital

Recommend, don't execute — and never propose past a known exposure cap. Use this for any
allocation or liquidity-forecast task from `head-of-operations`.

## Read first
- The task brief (allocation question, forecast horizon, or specific venue/balance)
- `departments/back-office/CLAUDE.md` — venues in use, current placement, exposure caps

## Procedure
1. **Scope the question.** Margin coverage? Funding/yield on idle balances? Liquidity forecast?
2. **Check exposure caps first.** Cite the current `risk-manager` cap you're working within.
3. **Model it.** Current placement, proposed change, resulting margin buffer or liquidity runway — with numbers.
4. **Flag counterparty risk** on parked balances — an unfamiliar venue's yield is a risk question too.
5. **Report** to `head-of-operations`: recommendation, cap check, what could go wrong.

## Output shape
```
**Question:** [allocation/forecast in scope]
**Current cap:** [venue-exposure cap this respects]
**Recommendation:** [proposed allocation/action]
**Risk flags:** [counterparty/venue concerns]
```

## Guardrails
- Never propose an allocation exceeding a known exposure cap — if the cap is unknown, ask, don't guess.
- No actual fund transfers — recommend only; head-of-operations executes under segregation of duties.
- Default to caution on new venues for parked balances.
