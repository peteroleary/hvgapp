# ORCHESTRATION — 24/7 OPERATION, TOKEN BUDGETS, DISPATCH ORDER

**Rule (Peter, 2026-08-22):** at least one agent is working at all times. Tokens are
subscription-bound and finite. The game is allocation and sequencing, not effort.

---

## 1. THE THREE REAL CONSTRAINTS

| Constraint | Verified fact | Consequence |
|---|---|---|
| **RAM** | 3 concurrent agents overloaded Peter's Mac on kickoff (2026-08-22) | **Cap: 3 live agent processes** (Peter, 2026-08-22). Monitor RAM — if it chokes again, drop to 2 and note it. Queue, don't swarm. |
| **Tokens** | Each runtime bills against its own subscription window (rolling hours + weekly caps). Actual burn per agent: **UNMEASURED** | PAT instruments via the headroom proxy — it sees 100% of LLM traffic and reports per-agent token use. Until then, budgets are guesses. |
| **Dependency order** | Critical path: CI fix → PR #18 → CLI binary → B1 verbs → board repair (P1→P5 in EXECUTION_PROMPTS.md) | The critical path never idles. Other slots run independent work only. |

## 2. ALLOCATION TABLE

Fill the Budget column from headroom telemetry once PAT instruments it. Until then the
posture column is the rule.

| Runtime / subscription | Agents | Posture |
|---|---|---|
| Claude | DEE, + roster per TEAM_BRIEFING | Heavy lanes (long specs, reviews). Burst right after the 5h window resets. |
| Kimi | per roster | Drafting, card filing, bulk transforms |
| Grok | per roster (incl. image-gen reroute, TOOL_PARITY §4) | Creative assets, media |
| Codex | per roster | Code lanes (B1, B4, CI) |
| Cursor | SLM, per roster | Light lanes — zero MCPs today (TOOL_PARITY §3) |
| Goose | per roster | Spillover / overnight queue |

**Ordering rules:**
1. Critical path first, always (P1→P5). An idle critical-path agent is a firing offense.
2. Then brand order: hvgapp → gomarco → itshvg/lhfyc/clean → three.
3. Within a brand: board column order — nothing enters In Progress while Spec'd has
   unassigned cards.
4. Long-horizon, low-token work (research sweeps, benchmark runs, draft writing) goes to
   the overnight/off-peak slots. Short interactive work gets the fresh windows.

## 3. THE DISPATCH LOOP

**Now (manual):** JUV is the dispatcher. On a fixed cadence JUV posts the next eligible
card per squad, one card per live slot (max 3). Source of truth: the boards, not memory.

**Assist (this week):** scheduled workflows fire the dispatch ping so it survives Peter
being offline. YAML below, P9 hands it to TIP.

**Target (after B2/B5 land):** the feed-rule executor nudges assignees on state changes
(stall, review-aging, done-certification) — dispatch becomes event-driven and JUV's cron
loop is retired.

## 4. IDLE AND BLOCKED DISCIPLINE (already law — SWO §7, kickoff)

- Blocked >30 min → escalate per routing, take the next card. Blocked is not a rest state.
- An agent with no card pulls the top Backlog card in its squad's brand order.
- Nobody waits on Peter except the §0 seven.

---

## P9 — GIVE TO JUV (#command)

```
You are the dispatcher, effective now. Every 4 hours, post one message in #command:

  SLOT 1 (critical path): <next undone P-item from EXECUTION_PROMPTS.md, or "clear">
  SLOT 2 (off-path): <top eligible Backlog card, brand order hvgapp -> gomarco -> ...>
  SLOT 3 (off-path): <next eligible Backlog card>
  BUDGET: <which subscription is freshest / which is hot, from PAT's telemetry when it exists>
  BLOCKED: <any card blocked >30 min, named owner of the blocker>

Never assign more than three live cards at once (Peter's cap, 2026-08-22). If the Mac
chokes again, drop to two and say so. When a slot reports done, refill it within the hour.
An idle slot with work in Backlog is your failure, not the agent's.
```

## P10 — GIVE TO TIP (#build)

```
Stand up the dispatch cron so it runs when Peter is offline. Create this workflow in
#command (buzz workflows create --channel fdf5cf79-6269-460c-bd3a-37c52c3397d9 --yaml ...):

name: Dispatcher ping
trigger: { on: schedule, cron: '7 */4 * * *' }
steps:
  - id: ping
    action: send_message
    text: "DISPATCH — JUV: post SLOT 1 / SLOT 2 / SLOT 3 / BUDGET / BLOCKED per docs/ORCHESTRATION.md P9. Max three live cards."

Also: once headroom is wrapped (WORK_ORDER_PONYTAIL_HEADROOM.md), give PAT the per-agent
token totals endpoint/report — the ORCHESTRATION allocation table is unmeasured until then.
DONE WHEN: the ping fires on schedule (verify in #command after 4h) and PAT confirms the
telemetry path.
```
