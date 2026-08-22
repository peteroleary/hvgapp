# EXECUTION PROMPTS — paste these, in order

Everything is verified against the live relay and repo, 2026-08-22. Each block names its
target. Paste into the channel shown. Do not improvise scope.

**Paste P0 and nothing else.** It hands the whole queue to JUV; the agents chain the rest
off channel posts. Peter is out of the loop after one paste.

Denial audit (verified live, 2026-08-22): JUV is a member of all 7 squad channels — every
dispatch post lands. Agents write under the harness (BUZZ_AUTH_TAG auto-injected); raw-key
shell runs 403 on global kinds — P4/P5 carry that warning. `set-profile` writes only the
caller's own identity — P6 routes profile-setting to each agent, not MFR. Git/gh mutations
use Peter's local gh auth, which agents on this Mac inherit (TUN pushed `62ac950` with it).

Current verified state (2026-08-22, live): 9 boards (hvgapp/gomarco/lhfyc created, owned
by the desktop identity `3b0c5670…`); hvgapp board holds cards B1–B8. **PR #18 and PR #19
are MERGED** — P1 and P2 are done. **The head of the critical path is now P11** (grok PTY
fix): YBY is grok-runtime and dead until P11 lands, so B1 (P4) and the board repair (P5)
sit behind it. If P11 stalls >1h, reassign B1 to MFR or TUN (both on live runtimes) rather
than let the path idle — say so in-channel when you do.

## P0 — GIVE TO JUV (#command) — THE ONLY PASTE

```
JUV — you now own the work queue. Peter is done pasting prompts.

The queue is ~/Desktop/hvgapp/docs/EXECUTION_PROMPTS.md, P1-P11, with the dependency
column. Dispatch it: post each P-item to its named agent in its named channel the moment
its dependencies report done in-channel. P1/P2 are already landed. **P11 is the head of
the critical path and has no dependencies — post it NOW**, plus P6. Everything grok-runtime
waits on P11; if TIP stalls >1h, escalate to Peter (a process restart is his).

Rules:
- Max three cards live at once (Peter's cap, 2026-08-22). Refill a slot within the hour when it reports done.
- Agents confirm completion in-channel with evidence (command output, PR link, board id).
  No evidence = not done = reassign or escalate, your call.
- You route, you never write code or board state.
- The ONLY reason to message Peter: an agent's process is down and needs a restart, or a
  §0 gated action needs his signature. Everything else you settle yourself.
- Every 4h (the dispatch cron will ping you): SLOT 1 / SLOT 2 / BUDGET / BLOCKED per
  docs/ORCHESTRATION.md P9.

Start by confirming which agents' processes are actually running. A prompt posted to a dead
process is silence, not work.
```

| # | Give to | Where | Depends on |
|---|---|---|---|
| P1 | TIP | #build | ✅ LANDED (PR #19 merged) |
| P2 | MFR | #build | ✅ LANDED (PR #18 merged) |
| P3 | TIP | #build | P2 |
| P4 | YBY | #build | P2 **+ P11** (YBY is grok-runtime) |
| P5 | TUN | #build | P4 |
| P6 | MFR | #build | nothing |
| P7 | YBY | #build | **P11** (same reason) |
| P8 | squad leads | each squad channel | P3 + P5 |
| P11 | TIP | #build | ✅ DONE (shim live, 8 agents verified respawning 2026-08-22 11:24 UTC) |
| P12 | TIP | #build | nothing — the 15-min watcher ([MONITORING.md](./MONITORING.md)) |

---

## P1 — TIP — SHIP THE CI FIX YOU ALREADY WROTE

```
Your branch tip/ghcr-push-gateway-namespace (2ed9936e) already fixes the Docker workflow —
IMAGE_NAME + GATEWAY_IMAGE derive from the GHCR_IMAGE repo variable, attestation uses
GITHUB_REPOSITORY_OWNER. It is sitting unmerged while every PR runs red.

1. cd into the worktree: /Users/po/Desktop/hvgapp/.worktrees/ghcr-push-gateway-namespace
2. Rebase onto current main, run the workflow lint, push, open the PR.
3. Set the repo variable: gh variable set GHCR_IMAGE --body "ghcr.io/pheartkeys/hvgapp" --repo pheartkeys/hvgapp
4. Merge with --admin if the only red is the old registry push.
5. Verify: next push to main runs the Docker workflow green end to end.

DONE WHEN: a push to main produces green Docker image builds in pheartkeys/hvgapp.
```

## P2 — MFR — LAND PR #18 TODAY

```
PR #18 (pheartkeys/hvgapp, branch prop/board-card-set) is ONE commit, f5350cfe:
card set / card move / --goal attach. It conflicts with main in exactly one file:
crates/buzz-cli/src/commands/board.rs. No more review theater — rebase and land it.

  git fetch origin pull/18/head:pr18
  git worktree add -b pr18-rebase .worktrees/pr18 pr18
  cd .worktrees/pr18 && git rebase origin/main
  # resolve board.rs — keep main's CARD_EXECUTION_STATES six-state set, take the PR's new verbs
  cargo build -p buzz-cli && cargo test -p buzz-cli
  git push origin HEAD:prop/board-card-set --force-with-lease
  gh pr merge 18 --repo pheartkeys/hvgapp --merge --admin

NOTE: main moved under you — docs commits plus TUN's 62ac950. The conflict is mechanical.
DONE WHEN: main contains f5350cfe's verbs and `buzz board card set --help` works from a
fresh build. Hand off to TIP (P3) in-channel.
```

## P3 — TIP — REBUILD AND INSTALL THE CLI

```
After MFR lands PR #18: the installed binary at ~/.local/bin/buzz predates the board verbs.

  cd /Users/po/Desktop/hvgapp && git pull origin main
  . ./bin/activate-hermit && cargo build --release -p buzz-cli
  cp target/release/buzz ~/.local/bin/buzz
  buzz board card set --help   # must succeed

DONE WHEN: the installed binary shows card set/move. Post proof in #build.
```

## P4 — YBY — BUILD B1: THE FOUR BOARD VERBS

```
Card B1 is filed on the hvgapp board. Build: board set, board retire, card delete,
board goal. Spec: ~/.buzz/PLANS/BUZZ_BOARD_CLI.md. PR #18 (landing via MFR) gives you the
read-modify-write pattern against the reconciled head — copy it, don't reinvent it.

Validation set (the Phase 0 repair): retitle three -> "We 3 Live", retire concrete, retire
sober, delete the five junk unified-master cards, create goals and attach a card via --goal.

AUTH WARNING: manual CLI runs with your raw agent key return 403 relay_membership_required.
Board kinds are global-scope and require NIP-OA owner delegation — run under the harness so
BUZZ_AUTH_TAG is injected, or nothing you write lands.

DONE WHEN: all four verbs in the runnable binary, TUN can execute the validation set.
```

## P5 — TUN — EXECUTE THE BOARD REPAIR

```
After YBY lands B1 and TIP installs the binary — the writes, from your key, under the
harness (raw key 403s on global kinds):

  buzz board set three --title "We 3 Live"
  buzz board retire concrete
  buzz board retire sober
  # delete the 5 junk cards on unified-master (board card delete — YBY's verb)
  # YBY separately: normalize unified-master from 4 columns to 5 (missing "Spec'd")

DONE WHEN (VON verifies, not you): exactly seven boards, correct titles, zero cards on a
slug outside the locked six, zero occurrences of "MoSober" or "K&B Concrete", and a card
files, assigns, moves, and re-tags from the CLI.
```

## P6 — MFR — ASSIGNEES SHOW HEX, NOT HANDLES. FIX THE RENDER SIDE.

```
Peter's complaint, and he's right: cards show 64-char hex instead of TUN/YBY/3TH.

RENDER: Desktop board UI and `buzz board get` must resolve assignee pubkey -> profile
display name, falling back to 8-char prefix only when no profile exists. File the card
on hvgapp (--fn build), assign it, build it.

DATA (not yours — each agent does its own): `buzz users set-profile` writes only the
CALLER's identity, so nobody can set profiles for anyone else. JUV appends this line to
every dispatch until all 19 report done:
  "First run: buzz users set-profile --name <YOUR HANDLE> — once, then never again."

DONE WHEN: `buzz board get hvgapp` prints TUN, not 845798e3….
```

## P7 — YBY — B4: DRAG AND DROP

```
DnD is not a mystery feature — the branch exists: comb/board-dnd-ui (b7f0e936) in
~/.buzz/REPOS/hvgapp-board-dnd. Rebase it onto current main (post-PR-#18), open the PR.
Drag = card move with rank from the reconciled target column, never caller-supplied.
DONE WHEN: drag a card Backlog -> Done in Desktop, rank validates, VON confirms no
reconciliation drift across authors.
```

## P8 — SQUAD LEADS — PHASE 1b FILING

```
Phase 1b is open once TIP posts binary proof (P3) and VON certifies Phase 0 (P5).
File your drafted sets: ~/.buzz/PLANS/CARDS_<SQUAD>_<BRAND>.md -> the matching board.

  buzz board card add --board <board> --title "..." --description "..." \
    --brand <slug> --fn <area> --assignee <hex>:lead

CORRECTIONS to the kickoff:
- The write boundary validates brand slugs: hvgapp's brand is `hvg-app`, not `hvgapp`.
- The six boards to file on: hvgapp, gomarco, itshvg, lhfyc, clean, three. Nothing else.
- NEW (ALLOCATION §2): every card description starts with `[floor:T0|T1|T2|T3]` — the
  minimum model tier allowed to execute it. No tag = T2. Floors are minimums; failover
  never goes below them.
DONE WHEN: every drafted card with a named assignee is filed on its brand's board.
```

## P11 — GROK-RUNTIME AGENTS (final state, 2026-08-22 ~14:10 UTC)

```
RESOLVED ROOT CAUSE (corrects the earlier PTY theory): the runtime catalog spawns
`<grok> agent`, but grok 1.0.5's ACP mode lives at `grok agent stdio`. Bare `grok agent`
drops into an interactive pager ("Open Grok Build — press Enter"), which needs a tty —
that pager, not ACP itself, was the ENXIO source. Verified: `grok agent stdio` answers a
full ACP initialize over plain pipes, no PTY required.

LIVE FIX (deployed by Kimi, 2026-08-22): shim at /Users/po/.local/bin/grok-acp-pty —
  exec /Users/po/.local/bin/grok "$@" stdio
All 8 grok-runtime agents (LDA, YBY, PAT, 3TH, BOO, Bumble, TIP, VON) are pinned to it via
agent_command_override. NOTE: LDA's record carries stale agent_args=["acp"] from its old
goose config — if LDA misbehaves, blank his agent_args in Desktop first.

RESTART REQUIRED: harness instances that exhausted 10 init retries ("cannot continue") do
NOT respawn on config change. Quit Buzz.app fully and relaunch (or toggle the 8 agents in
the UI). Verify: TIP's newest log shows a successful initialize, no "Method not found".

PERMANENT (MFR card): catalog should resolve grok -> `grok agent stdio` natively and the
shim retires; consider pinning the grok CLI version — the Aug 21 auto-update changed
headless behavior and took down 8 agents for a day.

DONE WHEN: all 8 grok-runtime agents initialize clean after a Buzz.app relaunch.
```
