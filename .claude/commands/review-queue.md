---
description: Show everything in the human-approval queue across offices. Trades/orders ready to authorize, agreements ready to sign, fund movements ready to execute, decisions ready to confirm.
---

Scan all offices for items needing human approval. Be specific.

For each office, list:
- File path / issue / PR
- One-line summary of what it is
- What action the human takes (authorize & execute / sign / merge / reject / etc.)

Check:
- `departments/front-office/strategy/` — approved-but-not-yet-live strategy mandates
- `departments/back-office/treasury/` — allocation recommendations awaiting execution
- `departments/cross-cutting/legal/` — draft agreements awaiting signature
- `departments/cross-cutting/security/` — custody/withdrawal-control changes awaiting sign-off
- GitHub PRs in draft state from `execution-engineer` subagent
- Risk approvals in `departments/middle-office/risk-reports/` pending founder confirmation

End with: **Total items pending: N**

Be ruthless about prioritization — order by impact, not by date.
