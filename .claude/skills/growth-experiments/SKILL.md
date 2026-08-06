---
name: growth-experiments
description: Marketing growth-experiment playbook. Design testable experiments (A/B, channel tests, landing variants) with an explicit hypothesis, single metric, and stopping rule; track results and feed wins/losses back into strategy. Produces an experiment brief and a results log. Use to validate growth ideas before scaling spend.
---

# Growth experiments

De-risk growth bets by testing them small before scaling. One hypothesis, one metric, an honest read.

## Read first
- `company/memory/COMPANY.md` — OKRs and the metric that matters
- Current strategy (see [[strategic-planner]]) — experiments should ladder up to it
- Past experiments and recaps in `departments/marketing/` — don't re-run a settled question

## Procedure
1. **Write the hypothesis.** "If we [change], then [metric] will [move] because [reason]." If you can't, it isn't an experiment yet.
2. **Pick one primary metric** and a guardrail metric (the thing you must not harm).
3. **Design the test.** Variant(s), audience/split, the smallest run that could move the metric. Note what needs the human (spend, account setup, code change → file an issue for head-of-software).
4. **Set the stopping rule up front** — sample size or duration, and the threshold for "ship it / kill it." Decide before you see data.
5. **Save the brief** to `departments/marketing/experiments/[date]-[name].md` and tag the founder to launch.
6. **After it runs,** hand results to [[analyze-data]], record the read (win/lose/inconclusive) in the same file, and feed wins into [[strategic-planner]] / [[content-calendar]].

## Output shape
```
**Hypothesis:** If [change] then [metric] [direction] because [reason]
**Primary metric:** [...]   **Guardrail:** [...]
**Design:** [variants, split, audience]
**Sample / duration:** [smallest meaningful run]
**Stopping rule:** [decided before launch]
**Needs human:** [spend / accounts / code issue #]
**Result:** [filled in after — win / lose / inconclusive + numbers]
```

## Guardrails
- Decide the stopping rule before seeing data — no moving the goalposts.
- Flag small N — an underpowered test is a story, not a result (defer the stats to [[analyze-data]]).
- No causation from correlation; isolate one change per experiment where you can.
- Nothing launches and no spend is committed without founder approval; code changes go to head-of-software via an issue.

Related: [[strategic-planner]], [[analyze-data]], [[content-calendar]], [[plan-campaign]].
