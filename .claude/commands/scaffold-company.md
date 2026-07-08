---
description: Scaffold a fresh AI company. The init agent interviews you and fills in the blank template files (company memory, departments, budget, decision log).
---

The founder wants to set up (or re-scaffold) the company. Invoke the `init` agent.

The `init` agent should:
1. Check whether `company/memory/COMPANY.md` is still blank (placeholders) or already filled —
   if already filled, ask before overwriting.
2. Interview the founder in short batches (identity, product, market, positioning/voice, OKRs,
   GTM/pricing, engineering stack, marketing channels, budgets).
3. Write the filled-in files: `COMPANY.md`, `BRIEF.md`, the department `CLAUDE.md`s, `BUDGET.md`,
   and seed `company/decisions/LOG.md` with a real "Company founded" entry dated today.
4. Print the remaining manual steps (Discord bots + `.env`, `gh workflow run setup-labels.yml`,
   `npm install` in `scripts/discord-agents`).

Optional seed context (an idea one-liner to pre-fill the interview): $ARGUMENTS
