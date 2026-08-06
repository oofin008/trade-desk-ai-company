# Activity Feed (cross-department, append-only)

Lightweight "who did what" feed so the **CEO stays in sync even on turns it wasn't part of** —
e.g. when the founder pings a department head directly (`@head-of-software`) and the CEO
never sees that turn. This is the cheap middle ground between a Discord reply (ephemeral)
and a GitHub Issue / COMPANY.md learning (durable, heavyweight).

## Who writes
Every department head **and** the CEO. At the end of any turn where you did meaningful work,
made a decision, or handed off — **append one line** before ending your turn. Skip it only for
trivial chatter (a one-line answer that changed nothing).

## Who reads
The **CEO reads this feed at the start of a turn** to catch up on work done via direct mentions.
Any head may read it to see what peers have been doing. It does not replace `BRIEF.md` for
company state.

## Format
One line per entry, newest at the bottom:

```
- YYYY-MM-DD @agent (trigger: founder | ceo | @peer): what I did / decided / handed off. → refs: #NN, draft path
```

- **trigger** = who kicked off the turn (so the CEO can tell which work bypassed it).
- **refs** = the durable record if one exists (GitHub issue #, PR #, draft file path). Optional.
- Keep it to one line. If it needs a paragraph, it belongs in a GitHub issue or COMPANY.md.

## Maintenance (CEO owns)
- Read new entries each turn; fold anything durable into `COMPANY.md` (learnings) or `BRIEF.md` (state),
  and log operating changes to `decisions/LOG.md`.
- Once digested, trim old entries so this file stays short (keep ~the last 2 weeks). Digested state
  lives in the canonical files — this is a rolling buffer, not an archive.

---

## Entries
Format: `- YYYY-MM-DD @agent (trigger: X): what happened. → refs`

_(No entries yet — the first agent turn appends here.)_
