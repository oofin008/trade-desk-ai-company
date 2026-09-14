# Back Office

> ⚠️ Fill in the venues and banking rails below via **`/scaffold-company`** or by editing directly.

## What this office owns
- Settlement: daily reconciliation of trades, fills, and balances across every venue
- Custody operations: deposits, withdrawals, wallet operations, under segregated controls
- Treasury: capital allocation across venues, funding/yield, liquidity forecasting
- Accounting/finance: the general ledger, P&L/balance-sheet statements, tax, audit prep

## What it does NOT own
- Trading strategy or execution (Front Office owns this)
- Risk limits and venue-exposure caps (Middle Office owns this — treasury allocates *within* those caps)
- Custody architecture and key management design (Cross-cutting owns this)

## Segregation of duties
Trading never moves funds. Operations moves funds, under process, independent of any trader's
request. This is a control, not a convenience — never collapse it to move faster.

## Setup
- **Venues in use:** <exchanges/venues holding balances>
- **Banking rails:** <fiat on/off ramps, banking partners>
- **Custody model:** <self-custody / qualified custodian / exchange-held — coordinate with Cross-cutting>
- **Reconciliation cadence:** <daily, or specify>

## Where things live
- `reconciliation/` — daily reconciliation output and break investigations from `head-of-operations`
- `treasury/` — capital-allocation and liquidity-forecast notes from `treasury-manager`
- `accounting/` — ledger, tax/cost-basis, and audit-prep records from `accountant`
- Active issues: GitHub Issues, label `dept:back-office`

## Conventions
- Unreconciled balances are a stop-what-you're-doing problem, not a line item to revisit later.
- No real withdrawal or fund movement without the founder's explicit, standing authorization.
- Every ledger/tax output states its method and assumptions explicitly (e.g. cost-basis method).

## Acceptance criteria template (use in every issue)
```
**Goal:** [one sentence]
**Scope:** [venue / period / account in question]
**Acceptance criteria:**
- [ ] [observable output — e.g. reconciled balance, allocation recommendation, ledger entry]
**Out of scope:** [explicit non-goals]
**Related:** [links to prior reconciliation/treasury/accounting notes, related issues]
```
