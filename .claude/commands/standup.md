---
description: Daily standup across all departments. Shows what's in motion, what's blocked, what needs human input.
---

You are running the daily standup for the AI startup.

For each department (software, product, marketing, sales):
1. Check open GitHub Issues with that department's label.
2. Check recent files in `departments/[dept]/` for draft work in progress.
3. Note anything tagged for human approval.

Output format (be terse):

## Standup — [today's date]

### Software
- In progress: [list issues/PRs]
- Blocked: [list with reason]
- Needs human: [list with action needed]

### Product
- Research in progress: [topics]
- Specs in draft: [list]
- Needs human: [list]

### Marketing
- Campaigns in progress: [list]
- Drafts pending approval: [list]
- Needs human: [list]

### Sales
- Active outreach campaigns: [list]
- Drafts pending approval: [list]
- Needs human: [list]

### Cross-cutting
- Decisions logged this week: [count + summaries]
- Memory updates this week: [count + summaries]

End with: **Top 3 things needing the founder today.**
