# Budget Tracker

> ⚠️ Blank template — set real numbers via **`/scaffold-company`** or edit directly.

**Last updated:** <YYYY-MM-DD>
**Reset cadence:** Monthly (1st of each month)
**Maintained by:** CEO (with office heads logging their usage)

This tracks discretionary spend per office — things the human will have to actually pay for. NOT Claude API tokens (those are tracked by the platform), and NOT trading capital/P&L (that's the desk's book, not a discretionary budget line). This is for: exchange/data fees, tools/subscriptions, licensing/legal invoices, custody/security tooling, etc.

Office heads must check this before recommending any spend, and append a line when spend is approved.

---

## Monthly budget (<Month Year>)

| Office         | Budget | Committed | Spent | Remaining |
|----------------|--------|-----------|-------|-----------|
| Front Office   | $0     | $0        | $0    | $0        |
| Middle Office  | $0     | $0        | $0    | $0        |
| Back Office    | $0     | $0        | $0    | $0        |
| Cross-cutting  | $0     | $0        | $0    | $0        |
| **Total**      | $0     | $0        | $0    | $0        |

**Front Office** budget covers: <exchange/venue fees, market/on-chain data feeds, backtesting infra.>
**Middle Office** budget covers: <risk/monitoring tooling, licensing/registration fees, sanctions-screening tools.>
**Back Office** budget covers: <custody/banking fees, accounting software, audit costs.>
**Cross-cutting** budget covers: <security audits, HSM/custody infra, outside/legal counsel invoices.>

## Spending rules
1. **Any spend > $50** requires founder approval before the agent recommends it.
2. **Any spend > office remaining** is blocked — agent must escalate to CEO.
3. **Tool subscriptions** count as monthly commitments (e.g., $30/mo tool = $30 committed each month until cancelled).
4. **Office heads** check this file before drafting any plan that involves spend.

## Spend log (append-only)
Format: `YYYY-MM-DD [dept] $amount — description — approved by [agent/human]`

(No spend yet.)

---

## How to update this file
When a spend is approved:
1. Append a line to the spend log.
2. Increment "Spent" for that office.
3. Decrement "Remaining."
4. Update "Last updated" date.
