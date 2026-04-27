# LawnCare — Claude Code Instructions

## Branching Workflow

**All work must happen on a feature branch. Never commit directly to `main`.**

### Rules for every task

1. Before writing any code, create a branch named after the Jira ticket:
   ```bash
   git checkout -b SCRUM-XX   # replace XX with the ticket number
   ```
2. Do all work on that branch.
3. When the task is complete, push the branch and open a pull request against `main`:
   ```bash
   git push -u lawnCare SCRUM-XX
   gh pr create --base main --title "SCRUM-XX: <ticket summary>" --body "Closes SCRUM-XX"
   ```
4. **Stop there.** Do not merge the PR. A human must review and approve before anything lands on `main`.
5. Report the PR URL to the user so they can review it.

### Branch naming

| Ticket | Branch name |
|--------|-------------|
| SCRUM-5 | `SCRUM-5` |
| SCRUM-12 | `SCRUM-12` |

### What agents must never do

- `git push lawnCare main` (direct push to main)
- `git merge` or `gh pr merge` without explicit human instruction
- Force-push to any branch (`--force`)
- Skip pre-commit hooks (`--no-verify`)

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- All components are `'use client'` — no server components yet
- Styling: Tailwind only, no CSS modules or inline styles beyond Tailwind classes

## Code Style

- No comments unless the WHY is non-obvious
- No emojis in code or commits unless the user asks
- Keep components in `app/components/`, hooks in `app/hooks/`, context in `app/context/`
