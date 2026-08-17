---
description: Show everything in the human-approval queue across departments. Drafts ready to ship, PRs ready to merge, decisions ready to confirm.
---

Scan all departments for items needing human approval. Be specific.

For each department, list:
- File path / issue / PR
- One-line summary of what it is
- What action the human takes (approve & send / merge / reject / etc.)

Check:
- `departments/marketing/drafts/` — draft assets awaiting publish
- `departments/sales/drafts/` — outreach drafts awaiting send
- GitHub PRs in draft state from `dev` subagent
- Specs in `departments/product/` not yet assigned

End with: **Total items pending: N**

Be ruthless about prioritization — order by impact, not by date.
