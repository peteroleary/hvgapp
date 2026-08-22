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

Hive cost column is what Peter pays. Tier column maps that spend to the provider SKU we
actually run against. Numeric caps are **not published** for most subscriptions — providers
meter compute, not message counts. Where no number exists, the watcher uses observed
rate-limit events as ground truth (see Observed column).

| Subscription | $/mo | Tier (hive) | Windows | Cap (published) | Reset behavior | Source (accessed 2026-08-22) | Observed in harness logs |
|---|---|---|---|---|---|---|---|
| Claude | $100 | Max 5× | **Session:** rolling 5 h. **Weekly:** all models. Shared across Claude chat, Claude Code, Cowork. | No token/message count; Max 5× = 5× Pro per session. Weekly hours vary by model mix. | Session window resets every 5 h. Weekly resets at a **fixed day/time per account** (Settings → Usage). | [Anthropic Max plan](https://support.claude.com/en/articles/11049741-what-is-the-max-plan) | **YES** — 110 `session limit` events 2026-08-21 on `opus[1m]` (90), `claude-fable-5[1m]` (16), `sonnet` (4). Example: `You've hit your session limit · resets 3:30pm (America/Chicago)` |
| Kimi | $200 | Vivace (inferred from $199 list) | **Weekly:** Kimi Code quota (7-day from subscription date). **Burst:** rolling 5 h rate window. **Monthly:** shared credit pool with Kimi Chat/Work/Agent — Kimi Code freezes if monthly pool exhausted even with weekly headroom. | No public token count; Vivace = 720 agent credits/mo (12× Moderato 60; shared pool). | Weekly quota refreshes every 7 days from subscription date (no rollover). 5 h window rolls continuously. Monthly credits reset at billing-cycle start. | [Kimi Code membership](https://www.kimi.com/code/docs/en/kimi-code/membership); [Kimi membership overview](https://www.kimi.ai/help/membership/membership-overview) | **NONE** — full log scan 2026-08-22 found no Kimi rate-limit strings (auth errors only on 2026-08-09). |
| Grok | $300 | SuperGrok Heavy (inferred from ~$300 list) | **Weekly:** single shared compute pool across Chat, Imagine, Voice, Build, API (replaced per-product daily caps June 2026). Free-tier Chat/Voice limits are separate. | No numeric allowance published; compute-metered % in Settings → Usage. Higher tier = larger pool (unsized). | Fixed weekly reset — day/time shown in Settings → Usage (not rolling). Extra Usage Credits or upgrade when exhausted. | [xAI Grok FAQ — weekly usage](https://docs.x.ai/grok/faq); [x.ai pricing](https://x.ai/pricing) (Heavy $300 inferred — not on fetched page) | **NONE** — full log scan 2026-08-22 found no Grok subscription-limit strings. |
| ChatGPT/Codex | $100 | ChatGPT Pro 5× | **Designed:** rolling 5 h window shared by local CLI/IDE messages + cloud chats. **Weekly:** additional cap. ChatGPT Work and Codex share one pool. | Per-model message *ranges* per 5 h (e.g. GPT-5.6 Sol Plus 10–100 / Pro 5× 50–500). Weekly % shown in Usage dashboard. | 5 h window rolls continuously when enforced. Weekly resets at fixed time (Usage dashboard / `/status`). | [ChatGPT pricing](https://learn.chatgpt.com/docs/pricing); [#32635 user report](https://github.com/openai/codex/issues/32635) (5 h meter disappeared 2026-07-12) | **CONFLICT** — 5 h meter disappeared 2026-07-12 per user reports; no first-party restoration date confirmed. **Hive observation still weekly-only** (no `session limit` strings in agent logs 2026-08-21/22). Watcher treats weekly as binding until 5 h reappears in CLI `/status` or harness logs. |
| Gemini | $50 | **UNKNOWN SKU** — $50 matches no published SKU (AI Plus $4.99, AI Pro $19.99, Ultra 5× $99.99, Ultra 20× $200); likely bundled Google One. Multiplier unknown until invoice confirms tier. | **Session:** compute allowance refreshes every 5 h. **Weekly:** hard stop after weekly cap. Limits factor prompt complexity, features, chat length. | Tier multipliers: Plus 2×, Pro 4×, Ultra 5× or 20× vs standard (no numeric prompt count since May 2026). | 5 h sub-windows roll until weekly cap; then downgrade to Flash-Lite or wait for refresh. Reset times in Settings → Usage Limits. | [Gemini Apps limits](https://support.google.com/gemini/answer/16275805?hl=en); [Google AI plans](https://one.google.com/about/google-ai-plans/) | **NONE** — no explicit rate-limit payload in harness logs 2026-08-22. |

**Watcher rule (unchanged):** until PAT's headroom proxy ships (P10), a parsed
`session limit` / `resets <time>` line in any agent log is a **HOT** signal for that
subscription. Relay `rate-limited: quota exceeded` lines are **relay-side**, not
subscription windows — do not conflate.

**Draft status:** Task 5 complete 2026-08-22 — SLM Steps 1–2, PAT Step 3 source-check
(PASS WITH CORRECTIONS), SLM Step 4 commit.

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
the task waits. Env-ready means a **smoked subscription login** on that runtime, not an
API key in Desktop env (S1 ruling, 2026-08-22). A task that waits because nobody is
env-ready is JUV's escalation, posted in #command with the missing *login* named — not a
prompt to paste a key.

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

Canonical table: [`ENV_MATRIX.md`](./ENV_MATRIX.md). Failover is **subscription →
subscription** (grok ↔ cursor ↔ claude/codex login). It needs **no key on any runtime**.

Desktop → Edit Agent → Advanced → Environment Variables writes a plaintext
`env_vars` map into `managed-agents.json`. That path is **not** a keychain. MIA
ruled 2026-08-22 (**S1**, nest `PLANS/TRUST_S1_AGENT_SECRET_CUSTODY.md`; INCIDENTS I6):
**NO on every secret-shaped cell** until the four product guards in that ruling §5
exist at a committed SHA. S0 non-secrets (`PLAID_ENV`, plain URLs, `BUZZ_AGENT_OS_*`)
may land now. Owned as:

- **PAT** produces the per-agent env matrix (which vars, per agent, per runtime).
- **MIA** clears anything touching secrets before it lands. Current clearance is NO
  on S1/S2/S3.
- **TIP** applies S0 via Desktop only (never by hand-editing the JSON) and runs a
  one-turn smoke per agent per runtime: "reply with your model name" against
  subscription logins only.
- **SLM** verifies the reported model matches the target runtime.
- No failover assignment ships to a runtime the agent hasn't smoked. The grok/PTY
  incident (2026-08-22, 8 agents dead for a day) is what happens when readiness is
  assumed. Floor: no env and no smoked login → the task waits. A waiting task is a
  correct outcome.

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
| 4 | Subscription window table (§1) | Complete 2026-08-22 (SLM + PAT source-check) |
| 5 | Per-agent env matrix | PAT draft + MIA S1 NO locked 2026-08-22; TIP apply + SLM smoke open. See [`ENV_MATRIX.md`](./ENV_MATRIX.md) |
| 6 | Desktop concurrency toggle | Build card, MFR |
| 7 | headroom telemetry (P10) | TIP/PAT — upgrades pacing from events to numbers |
| 8 | B2 executor absorbs matrix | MFR — automation lands underneath, rules unchanged |
