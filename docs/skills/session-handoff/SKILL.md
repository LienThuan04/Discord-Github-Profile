---
name: session-handoff
description: Resume or checkpoint work in this repository. Use at the start of every session, before stopping, and after finishing any task, so the next agent (Claude, Codex, Gemini, Antigravity) continues instead of starting over.
---

# Session handoff

`docs/PROGRESS.md` is the single **checkpoint** for this repository. Any agent session can be interrupted at any time, so the checkpoint must always reflect the real state *right now*.

## Starting a session (resume)

1. Read `docs/PROGRESS.md` — check **Đang làm** (In progress) and **Bước tiếp theo** (Next step).
2. In this repository (`D:\Coding\profileLienThuan04\Discord-Github-Profile`), run `git status --short` and `git log --oneline -5` and compare against the checkpoint. If they differ (unrecorded commits or file changes), treat git as the source of truth and update `docs/PROGRESS.md` before continuing.
3. Read `docs/PROJECT.md`.

Done when: you can state in one sentence where work stands and what the next concrete action is without asking the user.

## While working

Update `docs/PROGRESS.md` **immediately after each milestone** (a working change, a verified test run, a commit, or an important finding) — do not wait until the end of the session, because a session can be cut off by quota or timeout.

## Stopping or finishing a task (checkpoint)

Update `docs/PROGRESS.md`:

1. **Đang làm**: unfinished work + files being edited + the exact verification command to run next (`pnpm.cmd lint`, `pnpm.cmd typecheck`, `pnpm.cmd test`, etc.). If everything in scope is finished, set it to `(trống)`.
2. **Bước tiếp theo**: the first concrete action the next agent (or owner) should take.
3. **Nhật ký**: prepend one line at the top: `YYYY-MM-DD · <agent> · <task summary> · <commit hash if any>`. Keep at most ~20 lines; move older entries to `docs/memory/history.md`.
4. Learned a non-obvious integration fact or edge case? Record it in `docs/memory/gotchas.md` (pitfalls/verified facts) or `docs/memory/decisions.md` (architectural decisions and rationale).
5. Added, removed, or renamed code or documentation files? Run the `graphify-navigation` update step (`python -m graphify update .`).

Done when: another agent reading only `docs/PROGRESS.md` knows immediately where to resume.
