---
name: ship-pr
description: Ship a change as its own PR from a clean branch off main, verifying lint/tests/build locally and checking CI is green before merging. Use when the user says "crée une PR", "ouvre une PR", "ship ça", or asks to commit and merge a change to txt-tracker.
disable-model-invocation: true
---

# Ship PR (txt-tracker)

Encodes the exact workflow used throughout this project, including the lesson learned the hard way: **`npm run lint` passing is not enough** — `react-scripts build` runs its own internal ESLint pass (via ESLintWebpackPlugin) that can catch things `npm run lint` misses (e.g. an `eslint-disable` comment referencing a rule the build's lint config doesn't resolve the same way). Two PRs were merged with a broken build because this step was skipped. Never skip it again.

## Steps

1. **Start from a clean branch off `main`** — never stack on top of an already-merged branch:
   ```bash
   cd /home/user/txt-tracker
   git status                          # check for uncommitted work first
   git fetch origin main -q
   git checkout -b <descriptive-branch-name> origin/main -q
   ```
   If the change already exists as uncommitted work on another branch, `git stash`, checkout the new branch from `origin/main`, then `git stash pop` (or `git cherry-pick` the commit).

2. **Make the change.**

3. **Verify locally, in this exact order — all three, not just the first two:**
   ```bash
   npm test -- --watchAll=false
   npm run lint
   CI=true npm run build
   ```
   All three must pass before committing. `npm run build` is not redundant with `npm run lint` — they use different lint configurations.

4. **Commit** with a message explaining *why*, not *what* (the diff already shows what changed). Use the attribution trailer format already established in this repo's recent commits (`Co-Authored-By:` / `Claude-Session:` lines) if the session context provides one.

5. **Push and open the PR:**
   ```bash
   git push -u origin <branch-name>
   ```
   Then create the PR against `main` with `mcp__github__create_pull_request`, with a body explaining the cause and the fix (see recent PR descriptions in this repo for the expected level of detail — cause, fix, what was verified).

6. **Wait for CI, then check it before saying anything can be merged.** Never tell the user "you can merge" without checking the run's `conclusion`:
   ```
   mcp__github__actions_list (method: list_workflow_runs, filtered to the branch)
   ```
   If `status` is not yet `completed`, wait (e.g. `ScheduleWakeup` for ~60-90s) and check again — do not guess or assume it passed. If `conclusion` is `failure`, investigate and fix before telling the user anything is ready.

7. **Only after confirming `conclusion: "success"`**, tell the user the PR is ready to merge, or merge it directly if already asked to.

## Why this exists

This project's CI (`.github/workflows/ci.yml`) runs lint, tests, and build as three separate steps — mirroring what this skill checks locally. Two PRs (#41, #42) were merged into `main` while their CI run had already failed, because the merge was done without checking the run's status first. That broke the Vercel deployment. Step 6 exists specifically to make that mistake structurally hard to repeat.
