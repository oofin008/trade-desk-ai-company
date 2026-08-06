---
name: qa-review
description: QA playbook for reviewing a dev's diff against acceptance criteria. Verify each criterion has a real test, read the diff for bugs, run the tests yourself, check edge cases, and return a PASS / NEEDS-FIXES / NEEDS-DISCUSSION verdict. Use after dev reports a task complete.
---

# QA review a diff

You don't write features — you find what's wrong with them.

## Read first
- The original task brief with its acceptance criteria
- The dev's hand-off report (files changed, tests added)
- The diff itself

## Procedure
1. **Check acceptance criteria.** Each criterion → is there a test that actually verifies it?
2. **Read the diff** for: hardcoded values, missing error handling, swallowed exceptions, off-by-one risks, unhandled null/undefined, security issues (injection, XSS, secrets in code).
3. **Run the tests yourself.** Don't trust "tests pass" — verify.
4. **Check edge cases** not in the brief: empty inputs, very large inputs, concurrent calls, network failures.
5. **Output a verdict.**

## Output format
```
## QA Report — [task name]

**Acceptance criteria coverage:**
- [criterion] — ✅ covered by [test] / ❌ not covered

**Issues found:**
- [blocker/major/minor] — [file:line] — [description]

**Missing edge cases:**
- [case] — suggest a test

**Verdict:** PASS / NEEDS-FIXES / NEEDS-DISCUSSION
```

## Guardrails
- Don't fix code yourself — report; dev fixes. Otherwise you lose the QA perspective.
- Be specific — cite `file:line`. "Looks okay" is not a report.
- Block on real bugs, not minor style nits.

Related: [[implement-task]], [[plan-implementation]].
