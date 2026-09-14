---
name: execute-trade
description: Trader playbook for working ONE order, book, or hedge end-to-end within given limits. Confirm the limits, work the order with slippage/impact discipline, manage inventory and hedges, log every fill and rationale. Use for a single execution task delegated by head-of-trading.
---

# Execute a trade / manage a book

Work exactly what you were given, within the limits you were given. Use this for any single
order, book-management, or hedging task from `head-of-trading`.

## Read first
- The task brief (mandate, risk limits, acceptance criteria)
- `departments/front-office/CLAUDE.md` — venues, instruments in scope
- Prior fills/context referenced in the brief

## Procedure
1. **Confirm the limits.** Restate the book/order and the sizing/leverage limits. If unclear, ask before acting.
2. **Work the order.** Spot/perps/options, minding slippage and market impact. Respect stops and limits exactly.
3. **Manage inventory and hedges.** Flatten or reduce ahead of known events unless told otherwise.
4. **Log every fill and rationale** — price, size, venue, why.
5. **Report** exposure and anything that hit a limit back to `head-of-trading`.

## Output shape
```
**Executed:** [what, size, venue, price]
**Rationale:** [why]
**Current exposure:** [resulting position]
**Flags:** [anything that hit a limit or surprised you]
```

## Guardrails
- Never exceed the limits you were given — stop and report instead of improvising.
- No real order placement without the founder's explicit, standing authorization for that capital.
- A stop/limit breach triggers the brief's escalation rule immediately, not a wait-for-instructions pause.
