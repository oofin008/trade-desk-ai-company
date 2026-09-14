# Company Decisions Log

Append-only. Never edit or delete past entries. Each entry is a decision that changes how the company operates.

**Format:**
```
## YYYY-MM-DD — [Title]
**Decided by:** [agent or human]
**Context:** [why this came up]
**Decision:** [what was decided]
**Implications:** [what changes as a result]
```

---

## 2026-09-14 — Restructured as a crypto trading desk
**Decided by:** Human founder (via directive to Claude Code)
**Context:** The company launched from the generic 4-department AI-company template (Software, Product, Marketing, Sales), which was still entirely unfilled (`COMPANY.md`, `BUDGET.md` placeholders). The founder provided `crypto-desk-roles.html`, a role book for an 11-role crypto trading desk organized into Front Office, Middle Office, Back Office, and Cross-cutting, and asked for the company structure to be rebuilt to match it.
**Decision:** Replaced the 4-department template end-to-end with the crypto-desk structure: `ceo` + 4 office-head bots (`head-of-trading` / Front Office, `risk-manager` / Middle Office, `head-of-operations` / Back Office, `security-engineer` / Cross-cutting) and 7 specialist subagents (`trader`, `quant-researcher`, `execution-engineer`, `compliance-officer`, `treasury-manager`, `accountant`, `legal-counsel`). Risk Manager heads Middle Office rather than Compliance, preserving the HTML's emphasis on Risk reporting independently to the founder/board rather than through the desk. ADL schema, specs, prompts, compiled bots/roster, department docs, skills, root `CLAUDE.md`, `README.md`, `BUDGET.md`, and the GitHub label/routing automation were all updated to match.
**Implications:** All future work routes through the new offices — GitHub issues use `dept:front-office` / `dept:middle-office` / `dept:back-office` / `dept:cross-cutting` labels. No leverage, new venue, or new counterparty goes live without independent `risk-manager` sign-off. The business specifics (capital base, venues, jurisdictions, risk limits) are still unfilled — run `/scaffold-company` to complete the interview and populate `COMPANY.md`, the office `CLAUDE.md` files, and `BUDGET.md`. Discord bot tokens need renaming in `.env` (`DISCORD_TOKEN_TRADING/RISK/OPERATIONS/SECURITY`) before the new bots can run.
