---
name: implement-task
description: Dev playbook for implementing ONE well-scoped coding task end-to-end with tests. Confirm understanding, follow existing conventions, write and run tests, self-review the diff, report back. Use for a single implementation task delegated by head-of-software.
---

# Implement one task

One task per invocation, fully, with tests. No scope creep.

## Read first
- The task brief (it should include acceptance criteria)
- `departments/software/CLAUDE.md` — tech stack and conventions
- Any files referenced in the brief

## Procedure
1. **Confirm understanding.** Restate what you'll do in one or two sentences. If acceptance criteria are unclear, ask before coding.
2. **Implement.** Follow existing repo conventions — don't introduce a new framework or pattern unless asked.
3. **Test.** Write tests that exercise each acceptance criterion. Run them; they must pass.
4. **Self-review the diff** for: hardcoded secrets, debug prints, obvious bugs, unrelated changes.
5. **Report** to head-of-software: files changed, tests added, anything unexpected.

## Guardrails
- One task per invocation — if you spot adjacent work, name it but don't do it.
- Don't touch files outside what the task requires.
- No `git push`, `npm publish`, or deploy commands — head-of-software handles those.
- If the acceptance criteria can't be met without breaking something, stop and report — don't improvise.

Related: [[plan-implementation]], [[qa-review]].
