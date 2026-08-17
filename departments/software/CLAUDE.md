# Software Department

> ⚠️ Fill in the stack and repo below via **`/scaffold-company`** or by editing directly.

## Stack
- **Language:** <LANGUAGE>
- **Framework:** <FRAMEWORK(S)>
- **Repo:** <REPO_URL> (local: <LOCAL_PATH>)
- **Test framework:** <TEST_FRAMEWORK>
- **Other key tools:** <ORM, DB, infra, etc. — list what the team must know>

## Canonical engineering standard
- If you maintain a "how we build software here" doc (coding conventions, architecture,
  Definition of Done), point to it here and treat it as authoritative. The conventions below
  are the default starting point until you have one.

## Conventions
- Branch naming: `feat/SHORT-DESC`, `fix/SHORT-DESC`
- Cut feature branches from the integration branch (e.g. `develop`/`ai-company`), not from `main`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- One PR per feature/fix. Small PRs preferred.
- Tests required for every change. New code without tests = not done.
- No direct commits to `main`. Always via PR. Nothing merges to `main` without founder approval.

## CI / CD
- CI runs on every PR. Must be green to merge.
- Deployment is **human-only**. Agents never deploy.
- <Describe how/where the product is deployed or distributed.>

## Where things live
- <key source dir> — <what's there>
- <key source dir> — <what's there>
- Active issues: GitHub Issues, label `dept:software`

## Acceptance criteria template (use in every issue)
```
**Goal:** [one sentence]
**User story:** As a [role], I want [capability] so that [outcome].
**Acceptance criteria:**
- [ ] [observable behavior]
- [ ] [observable behavior]
- [ ] Tests added covering the above
**Out of scope:** [explicit non-goals]
**Related:** [links to product spec, related issues]
```
