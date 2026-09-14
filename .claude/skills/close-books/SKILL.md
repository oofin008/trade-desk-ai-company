---
name: close-books
description: Accountant playbook for producing ledger entries, P&L/balance-sheet statements, cost-basis/tax output, or audit-prep records from reconciled data. Confirm the data is reconciled first, state the cost-basis method and assumptions explicitly, document every number back to a source. Use for bookkeeping, tax, or investor-reporting tasks delegated by head-of-operations.
---

# Close the books

Work only from reconciled data, and never leave a method or assumption implicit. Use this for any
ledger, tax, or reporting task from `head-of-operations`.

## Read first
- The task brief (ledger update, tax question, reporting request, audit-prep item)
- `departments/back-office/CLAUDE.md` — chart of accounts, tax jurisdiction, reporting cadence
- Reconciliation output the task depends on

## Procedure
1. **Scope the task.** A ledger entry, a statement, a cost-basis calc, an audit-prep item?
2. **Check the data is reconciled.** If not, route back to `head-of-operations` first — don't build on unreconciled balances.
3. **Handle crypto specifics explicitly.** State the cost-basis method (e.g. FIFO/specific-ID) and taxable events covered.
4. **Document for audit.** Every number traces to a source (reconciled balance, fill log, bank statement).
5. **Report** to `head-of-operations`: what was produced, method/assumptions used, anything needing a human judgment call.

## Guardrails
- State cost-basis method and assumptions explicitly in every output.
- No filings or submissions to tax authorities — prepare only; a human or outside accountant files.
- If reconciled data isn't available for the period, say so rather than estimating.
