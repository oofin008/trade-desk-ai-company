---
name: settle-and-reconcile
description: Head-of-Operations playbook for daily reconciliation and custody-ops coordination. Reconcile trades/fills/balances across venues, investigate breaks same-day, delegate allocation and books to treasury/accounting, check venue-collateral moves with Risk, maintain segregation of duties. Use for reconciliation, custody-ops, treasury, or accounting tasks.
---

# Settle and reconcile

Make the numbers true, and keep capital where it needs to be — without ever letting trading move
funds. Use this for daily reconciliation and any settlement/custody-ops/treasury/accounting task.

## Read first
- `departments/back-office/CLAUDE.md` — venues, banking rails, custody model in use
- Latest reconciliation output, if following up on a prior break

## Procedure
1. **Reconcile.** Trades, fills, and balances across every venue. Any break gets a root cause, not just a note.
2. **Delegate capital allocation/liquidity forecasting** to `treasury-manager` via `Task`.
3. **Delegate books/tax/reporting** to `accountant` via `Task`.
4. **Check venue caps with `risk-manager`** before treasury moves meaningful collateral to a new venue.
5. **Log** anything that changes a standing banking relationship, custody control, or venue cap to `company/decisions/LOG.md`.

## Output shape
```
**Reconciled:** [venues/period covered]
**Breaks found:** [none, or list with root cause + status]
**Delegated:** [treasury-manager / accountant tasks dispatched, if any]
**Flags for Risk:** [collateral moves needing a cap check]
```

## Guardrails
- Unreconciled balances are stop-what-you're-doing, not a line item for later.
- Segregation of duties is absolute — never execute a fund movement a trader requested without an independent step.
- No real withdrawals/fund movements without the founder's explicit, standing authorization.
