# Middle Office

> ⚠️ Fill in the starting limits and jurisdictions below via **`/scaffold-company`** or by editing directly.

## What this office owns
- Risk: position/leverage/concentration limits, stress testing, the risk dashboard
- Counterparty and venue risk modeling
- Compliance: KYC/AML onboarding, licensing/registration, sanctions screening, internal policy

## What it does NOT own
- Trading strategy or execution (Front Office owns this)
- Settlement, custody operations, treasury, accounting (Back Office owns this)
- Custody architecture and key management (Cross-cutting owns this)

## Independence
Risk and Compliance report to the **founder/board**, not to the trading desk. `risk-manager`
escalates breaches directly — never filtered through `head-of-trading`. This is the desk's
primary defense against blow-up risk; do not let it get negotiated away.

## Starting parameters
- **Position/leverage limits:** <per-trader and per-book limits, or "TBD — Risk sets on hire">
- **Per-venue exposure caps:** <cap per exchange/counterparty, or "TBD">
- **Jurisdictions requiring licensing:** <list, or "TBD">
- **Stress-test cadence:** <e.g. weekly gap-move / venue-outage / funding-shock scenarios>

## Where things live
- `risk-reports/` — stress tests, exposure reviews, breach logs from `risk-manager`
- `compliance/` — KYC/AML records, sanctions-screening notes, licensing/filing tracker from `compliance-officer`
- Active issues: GitHub Issues, label `dept:middle-office`

## Conventions
- No leverage increase, new venue, or new counterparty goes live without `risk-manager` sign-off.
- Standing limit changes get logged to `company/decisions/LOG.md` and this file kept current.
- Regulatory conclusions that aren't confident get marked `TBD — needs outside counsel`, never guessed.

## Acceptance criteria template (use in every issue)
```
**Goal:** [one sentence]
**Scope:** [venue / counterparty / jurisdiction / limit in question]
**Acceptance criteria:**
- [ ] [observable output — e.g. updated limit, screening result, filed policy]
**Out of scope:** [explicit non-goals]
**Related:** [links to prior risk/compliance notes, related issues]
```
