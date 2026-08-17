---
name: content-calendar
description: Marketing editorial-calendar playbook. Turn the strategic plan into a dated content schedule — cadence, topics, channels, owners, and the brief stub for each piece. Produces a calendar draft that feeds copywriter/designer briefs. Use to plan content across a window (month/quarter).
---

# Content calendar

Turn strategy into a concrete, dated schedule of content the team will draft. The calendar is the source of briefs, not the content itself.

## Read first
- The current strategy (`departments/marketing/plans/[date]-strategy-*.md`, see [[strategic-planner]])
- `company/memory/COMPANY.md` — ICP, positioning, brand voice
- `departments/marketing/CLAUDE.md` — channels and priority (Facebook, Line OA, blog/landing, email for this ICP)

## Procedure
1. **Set cadence.** How many pieces per channel per week, given capacity. Be realistic — fewer good pieces beat a full grid of filler.
2. **Map topics to the funnel.** Each topic serves awareness, consideration, or conversion; tie it to a segment and the campaign it supports.
3. **Assign channel + format** per piece (blog post, FB post, Line broadcast, email, landing section).
4. **Slot dates** around launches and dependencies (don't promote what Software hasn't shipped).
5. **Write a one-line brief stub** per piece — audience, key message, CTA — ready to expand into a [[draft-copy]] or [[design-asset]] brief.
6. **Save** to `departments/marketing/plans/[date]-content-calendar-[period].md` and tag the founder.

## Output shape
```
| Date | Channel | Format | Topic | Funnel stage | Segment | Owner | Brief stub |
|------|---------|--------|-------|--------------|---------|-------|-----------|
```

## Guardrails
- Nothing on the calendar is published — each row becomes a draft that goes through the approval queue.
- No claims a piece can't back from COMPANY.md/research.
- Match channel norms for this ICP; don't plan Twitter/LinkedIn unless the founder directs.
- Keep it sustainable — an over-stuffed calendar that slips is worse than a lean one that ships.

Related: [[strategic-planner]], [[plan-campaign]], [[draft-copy]], [[design-asset]].
