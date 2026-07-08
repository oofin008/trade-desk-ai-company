# Budget Tracker

> ⚠️ Blank template — set real numbers via **`/scaffold-company`** or edit directly.

**Last updated:** <YYYY-MM-DD>
**Reset cadence:** Monthly (1st of each month)
**Maintained by:** CEO (with department heads logging their usage)

This tracks discretionary spend per department — things the human will have to actually pay for. NOT Claude API tokens (those are tracked by the platform). This is for: ad spend, tools/subscriptions, contractor invoices, swag, etc.

Department heads must check this before recommending any spend, and append a line when spend is approved.

---

## Monthly budget (<Month Year>)

| Department | Budget | Committed | Spent | Remaining |
|------------|--------|-----------|-------|-----------|
| Software   | $0     | $0        | $0    | $0        |
| Product    | $0     | $0        | $0    | $0        |
| Marketing  | $0     | $0        | $0    | $0        |
| Sales      | $0     | $0        | $0    | $0        |
| **Total**  | $0     | $0        | $0    | $0        |

**Software** budget covers: <CI minutes, dev tools, infra for testing, paid libraries/services.>
**Product** budget covers: <competitor tool subscriptions for analysis, user research outreach.>
**Marketing** budget covers: <ad spend, design tools, channel setup.>
**Sales** budget covers: <outreach/prospecting tooling, demo costs.>

## Spending rules
1. **Any spend > $50** requires founder approval before the agent recommends it.
2. **Any spend > department remaining** is blocked — agent must escalate to CEO.
3. **Tool subscriptions** count as monthly commitments (e.g., $30/mo tool = $30 committed each month until cancelled).
4. **Department heads** check this file before drafting any plan that involves spend.

## Spend log (append-only)
Format: `YYYY-MM-DD [dept] $amount — description — approved by [agent/human]`

(No spend yet.)

---

## How to update this file
When a spend is approved:
1. Append a line to the spend log.
2. Increment "Spent" for that department.
3. Decrement "Remaining."
4. Update "Last updated" date.
