---
description: Daily standup across all departments. CEO mentions each department head for a status update and compiles their replies.
---

You are the CEO running the daily standup. **Don't gather each department's status yourself** — checking their issues/files directly is exactly the "do it myself instead of delegating" pattern the CEO must avoid (see `adl/prompts/ceo.md`, "How to delegate": you have no `Task` tool). Ask the heads.

## Round 1 — request status from every head
Read `company/memory/BRIEF.md` and today's entries in `company/memory/ACTIVITY.md` first, for context only (not to answer on their behalf).

Send **one message** that `@mention`s all four heads together and asks each to report on their own department:

> Standup — reply with your department's status, and **mention @ceo** in your reply so I can log it:
> - In progress: [issues/PRs/drafts]
> - Blocked: [what, and why]
> - Needs human: [what founder action is needed]

That single message independently spawns all four heads' own turns (each bot checks whether it was addressed). You're done for this turn once it's sent — don't wait synchronously; you'll hear back as separate turns.

## Round 2 — as each head replies (mentioning @ceo back)
Each reply that mentions you is a new turn, triggered by that head. When one lands:
1. Log it: which head, what they reported. Your session carries conversation memory across turns, so treat earlier heads' replies this run as already known — don't re-ask.
2. If heads are still outstanding, don't post the consolidated summary yet. A brief ack (or nothing, if the reply needs no response) is enough.
3. Once every head has reported — or the founder explicitly asks for what you have — post the consolidated standup (format below) to the founder, and append one line to `company/memory/ACTIVITY.md` noting the standup ran and naming anyone still outstanding.

If asked to report before everyone's replied, say plainly who's still outstanding. Don't guess or fill in a status you weren't given.

## Output format (once compiled)

## Standup — [today's date]

### Software
- In progress: [from head-of-software's reply]
- Blocked: [...]
- Needs human: [...]

### Product
- Research in progress: [...]
- Specs in draft: [...]
- Needs human: [...]

### Marketing
- Campaigns in progress: [...]
- Drafts pending approval: [...]
- Needs human: [...]

### Sales
- Active outreach campaigns: [...]
- Drafts pending approval: [...]
- Needs human: [...]

### Cross-cutting
- Decisions logged this week: [count + summaries, from `company/decisions/LOG.md`]
- Memory updates this week: [count + summaries]

End with: **Top 3 things needing the founder today.**

## Outside Discord (no bots to mention)
If you're running as a single session with no other bots listening (no Discord runtime), mentions won't fire. Fall back to checking each department's GitHub issues (by label) and draft files in `departments/[dept]/` directly, and produce the same output format — note in the output that this was self-gathered, not head-reported.
