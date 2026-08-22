# ALLOCATION — MODEL-TO-TASK ALLOCATION, UTILIZATION, AND PACING

**Status:** APPROVED by Peter, 2026-08-22. Companion to
[`ORCHESTRATION.md`](./ORCHESTRATION.md) (dispatch mechanics) and
[`MONITORING.md`](./MONITORING.md) (the watcher). This doc owns *what model gets what
work, and at what rate*. Approach: hybrid — rules + JUV + watcher now; B2 executor +
headroom telemetry automate it underneath later, unchanged rules.

## 0. FIRST PRINCIPLES

1. **Never idle.** A subscription window closing with headroom while eligible work exists
   is a dispatch failure. (ORCHESTRATION owns the mechanics; this doc owns the floors.)
2. **Never exhaust.** Fable, Opus, Sol, K3, or Grok 4.6 fully exhausted with a day-plus
   to reset means planning was lazy and the strong models were over-fed. Exhaustion is a
   planning failure, not a usage success. Pacing beats speed.
3. **Planning is the product.** A rushed plan burns T1 tokens fixing T3 mistakes. Planning
   cannot be lazy or rushed — §4 makes that a gate, not a value statement.
4. **Measure, then tune.** No token telemetry exists today (verified 2026-08-22). Every
   number below marked *(tune)* is a starting ratio PAT corrects from the weekly report.

## 1. SUBSCRIPTIONS UNDER MANAGEMENT

| Subscription | $/mo | Window mechanics |
|---|---|---|
| Claude | $100 | 5-hour rolling windows + weekly cap (confirmed by live rate-limit events) |
| Kimi | $200 | *(PAT documents from telemetry + provider docs)* |
| Grok | $300 | *(PAT)* |
| ChatGPT/Codex | $100 | *(PAT)* |
| Gemini | $50 | *(PAT)* |

PAT's first telemetry job: a written table of each subscription's real windows, caps, and
reset behavior — sourced from provider docs plus observed rate-limit events in harness
logs, dated. Until then the watcher treats "rate-limit event seen" as the only truth.

## 2. THE TIER SYSTEM

Floors are **minimums**. Failover may move work up or sideways, never below floor.

| Tier | Work | Models |
|---|---|---|
| **T0** — gated judgment | MIA security review, DEE purpose gate, ship gates, §0-adjacent calls | Fable / Opus class only |
| **T1** — deep work | Architecture, PR review, planning briefs, specs | Sonnet / Fable / gpt-5.6 / Grok 4.6 / K3 class |
| **T2** — production | Code gen, card drafting, transforms, docs | Mid tier (Sonnet, K3, Grok 4.6, gpt-5.6 default) |
| **T3** — bulk | Research sweeps, summaries, filing, card expansion, monitoring summaries | Cheapest live model: Gemini flash-class, Haiku-class, Kimi-for-coding, GPT mini-class |

**Floors live on cards.** Every card carries `[floor:T?]` in its description (parseable
today; becomes a real field when the rebuilt binary ships `card set` — P3). No tag = T2.

**Failover:** subscription capped → next-cheapest live model at or above the floor.
An agent failing over into a runtime must already be env-ready for it (§6) — otherwise
the task waits. A task that waits because nobody is env-ready is JUV's escalation, posted
in #command with the missing env named.

## 3. BUDGET PACING — THE ANTI-EXHAUSTION MECHANICS

Exhaustion at day-minus-two is the failure this section exists to prevent.

1. **Weekly budget, rationed.** Each subscription's weekly cap gets a spend curve: no more
   than **50% in the first 3 days** *(tune)*, and no single 5-hour window may burn more
   than **35% of the remaining weekly budget** *(tune)*.
2. **Strong-model work is scheduled, not just queued.** JUV's dispatch posts name the
   window: "T1 work runs in fresh windows; T3 fills the tail."
3. **The watcher enforces the curve.** It tracks rate-limit events and (post-headroom)
   actual burn; when a subscription crosses 80% of a window's ration, it posts
   `HOT: <subscription>, <reset time>` to #command and JUV shifts that lane's T2/T3 work
   to colder subscriptions immediately.
4. **T0/T1 reserve.** The last 15% *(tune)* of every strong-model weekly budget is
   reserved for T0/T1 only. T2 never touches the reserve; T3 never comes near it.
5. **All-capped is reported, not hidden.** If every subscription is capped, JUV posts
   IDLE-WINDOW with the next reset time. That post is a planning-failure record and shows
   up in PAT's weekly report.

## 4. THE PLANNING PIPELINE — WHAT HAPPENS AFTER THE PLAN

No brand enters S1 without this pipeline completing. The stages:

1. **Kickoff huddle** — Peter + ICBM + MFR + PMP + relevant leads. Artifact (definition,
   audience, offer, flow, surface set) posted within 30 min (WORKFLOW §1, H1).
2. **T1 briefs** — the strong models write planning briefs: dense, unambiguous, each with
   done-when criteria. Brief quality sets the ceiling for everything downstream.
3. **T3 card-writers expand** — cheap models turn briefs into every imaginable card:
   edge cases, variants, failure modes. Cheap models elaborate excellent instructions;
   they never plan from a blank page.
4. **PAT vets** — dedupe, contradictions, scope check, floor assignment (`[floor:T?]`).
5. **Completeness gate** — JUV rejects filings from brands whose artifact misses the
   checklist (audience, offer, flow, card-set coverage, floors). MIA/DEE confirm the gate
   ran. **Lazy planning dies here, not in production.**
6. **Filing** — P8 mechanics onto the brand board.
7. **Dispatch** — JUV per the matrix + pacing rules.
8. **Execution + verification** — VON verifies; nobody self-certifies.
9. **Retro** — lessons written as relay notes (§7). The template extraction feeds the
   next brand's Kickoff.

## 5. CONCURRENCY CONTROL

- Source of truth: `~/.buzz/max-agents` — a file containing `1`, `2`, or `3`.
- **Interim (today):** Peter sets it with one command; JUV and the watcher read it before
  every dispatch. Peter at the keyboard → 1. Away → 3.
- **Permanent:** Desktop toggle button (Agent → Settings) writing the same file — Build
  card, MFR. The watcher enforces: over-cap → posts HOLD to #command, JUV queues.
- Overnight (unattended): cap is 3 by default; only T3-reservoir and research lanes run;
  §0 gated actions never fire unattended.

## 6. PER-AGENT ENV READINESS (FAILOVER SURVIVABILITY)

Every agent gets its own environment-variable set (Desktop → Edit Agent → Advanced →
Environment Variables) covering **every runtime it could fail over into** — credentials,
base URLs, model pins. Owned as:

- **PAT** produces the per-agent env matrix (which vars, per agent, per runtime).
- **MIA** clears anything touching secrets before it lands.
- **TIP** applies and verifies with a one-turn smoke task per agent per runtime.
- No failover assignment ships to a runtime the agent hasn't smoked. The grok/PTY incident
  (2026-08-22, 8 agents dead for a day) is what happens when readiness is assumed.

## 7. THE LEARNING LOOP — DATA, STORAGE, ACCESS

Build nothing new. Three stores already exist:

| Store | What goes there |
|---|---|
| Relay `notes` (NIP-23 long-form) | Retros, lessons, PAT's weekly utilization report, brief templates |
| Agent `mem` engrams (NIP-AE) | Per-agent working memory: what worked, what failed, at what model |
| `~/.buzz` git repo (PLANS/, RESEARCH/) | Plans, card sets, research artifacts — versioned, diffable |

**Rules:** every card closes with a result note (what model, how many turns, what broke).
Every Retro writes lessons as a note. PAT's weekly report reads notes + harness logs +
board history and tunes: the tier matrix, the pacing ratios *(tune)*, and the brief
templates. **Execution refines because instructions compound — not because anyone
remembers.**

## 8. 24/7 UNATTENDED MACHINERY

- Mac never sleeps (pmset); Buzz.app under a launchd keepalive — crash → relaunch.
- The watcher (P12) runs every 15 min regardless; pages Peter only when the Desktop app
  itself is down.
- Overnight lanes: T3 reservoir + research only. Nothing that spends money, publishes, or
  contacts a real person runs unattended (§0 of STANDING_WORK_ORDER).

## 9. ROLES

| Who | Owns |
|---|---|
| **JUV** | Dispatch per matrix + pacing; rejects unplanned-brand filings; never writes |
| **Watcher** (P12) | Pressure map, pacing enforcement, anomaly posts |
| **PAT** | Telemetry, weekly utilization report, env matrix, matrix tuning |
| **MIA** | Clears env/secrets changes; T0 review |
| **TIP** | Applies env sets, builds/maintains the watcher |
| **MFR** | Desktop toggle card; B2 absorbs this doc as code later |
| **VON** | Verifies; nobody self-certifies |

## 10. FAILURE RULES

- Model fails mid-task → requeue at same floor, noted on the card.
- Two consecutive failures on one card → escalate to JUV with evidence. Never silently
  degrade below floor.
- Rate-limit storm (all capped) → IDLE-WINDOW post + reservoir maintenance (docs, cleanup)
  if any cheap lane is warm.
- Watcher down >30 min → JUV posts BLIND; Peter restarts it. Monitoring the monitor is
  his one standing job.

## 11. SUCCESS METRICS (PAT's weekly report)

- **Idle-window-hours → 0.** The 5-minute-gap count Peter cited; the watcher counts them.
- **Burn % per subscription vs. cap** — high but never 100% before day 6.
- **Exhaustion events → 0.** Any strong model at cap with >24h to reset is a red page.
- **Task-to-tier mismatches** — T1 tokens spent on T3 work, or T0 work done below floor.
- **Time from plan-artifact to full card set** per brand — planning pipeline velocity.

## 12. BUILD ORDER

| # | Piece | Status |
|---|---|---|
| 1 | Watcher (P12) | Prompted, TIP |
| 2 | `[floor:T?]` convention in card drafts | This doc; effective with Phase 1b filing (P8) |
| 3 | `~/.buzz/max-agents` + dispatch rule | This doc; effective on JUV's next dispatch |
| 4 | Subscription window table (§1) | PAT, first telemetry job |
| 5 | Per-agent env matrix | PAT → MIA → TIP |
| 6 | Desktop concurrency toggle | Build card, MFR |
| 7 | headroom telemetry (P10) | TIP/PAT — upgrades pacing from events to numbers |
| 8 | B2 executor absorbs matrix | MFR — automation lands underneath, rules unchanged |
