# WORKFLOW — BRAND LAUNCH PIPELINE AND HUDDLES

**Companion to:** [`STANDING_WORK_ORDER.md`](./STANDING_WORK_ORDER.md) · [`SQUADS.md`](./SQUADS.md) · [`TEAM_BRIEFING.md`](./TEAM_BRIEFING.md)
**Status:** ACTIVE.

Every brand runs the same eight stages in the same order. What changes per brand is the surface
set and the gates, never the sequence.

---

## 1. HUDDLE — WHAT IT ACTUALLY IS TODAY

Verified against `VISION.md` and `crates/buzz-core/src/kind.rs`, 2026-08-21.

| | |
|---|---|
| **Shipped** | WebSocket Opus voice relay in `buzz-relay`. NIP-42 auth, room admission, peer forwarding, no external SFU. Agents join the same relay as humans, bringing their own STT/TTS. |
| **Lifecycle events** | `48100` started · `48101` joined · `48102` left · `48103` ended · `48106` guidelines · `24810` reaction burst (ephemeral) |
| **NOT shipped** | **Recording and per-track publishing are `planned`.** |
| **NOT shipped** | **No CLI support.** Zero huddle references in `crates/buzz-cli/src`. Huddles are Desktop-only. |

### The two rules those facts force

**RULE H1 — A Huddle that produces no written artifact did not happen.**
Nothing said in a Huddle is recorded. The lifecycle events prove a Huddle *occurred*; they
preserve nothing of what was decided. **The named scribe posts the artifact to the relay before
the `48103` ended event is 30 minutes old.** No artifact, no decision — the huddle is re-run.

**RULE H2 — Huddles are Desktop-only until the CLI lands.**
An agent running headless cannot start or join one. Until `buzz huddle` exists, every Huddle
needs a human or a Desktop-attached agent to convene it, and **no workflow step may block on a
Huddle an agent cannot reach.** Filed as gap 1 in §7.

---

## 2. THE PIPELINE — EIGHT STAGES, EVERY BRAND

| # | Stage | What it produces | Squads | Board column |
|---|---|---|---|---|
| **S0** | **Define** | Brand definition, audience, offer, goal, flow | Command, Growth, R&D | — |
| **S1** | **Found** | Accounts, domain, repo scaffold, deploy pipeline, analytics baseline | Build, Ship, Growth | Backlog → Spec'd |
| **S2** | **Model** | Brand kit + the data models that are expensive to change later | Creative, Build, R&D | Spec'd |
| **S3** | **Equip** | Every tool named in the S2 spec installed, cleared, and **confirmed reachable** | R&D *(PAT)*, Trust *(MIA)*, Ship *(TIP)* | Spec'd |
| **S4** | **Build** | Surfaces, in the order in §3 | Build, Creative | In Progress |
| **S5** | **Verify** | Test results, security/privacy/compliance sign-off | Ship, Trust & Safety | In Review |
| **S6** | **Prep** | Legal pages, channels live, SEO/schema, analytics verified | Growth, Creative, Trust | In Review |
| **S7** | **Publish** | The brand is publicly reachable | Ship, Command | Done |
| **S8** | **Operate** | Marketing, advertising, community, support, iteration | Growth, Creative, Trust | *(new cards)* |

**S3 Equip is owned by [`TOOLING.md`](./TOOLING.md).** It sits here and nowhere else: it cannot go
earlier because "what tools do we need" is only answerable against S2's spec, and it cannot go
later because agents entering Build without tools improvise with whatever is at hand — and that
choice becomes permanent. **The S2 Spec Huddle now also outputs the tool gap list**; S3 executes
it. No new huddle. Exit criterion is a tool the assigned agent can actually reach, not a config
entry claiming it exists.

**S2 is the stage people skip and pay for.** The review content model, the service catalogue
schema, the design tokens — get these wrong and everything built after them needs migrating.
`H1` on the `itshvg` board says exactly this: *"the one HVG card that is expensive to change later."*

**S0 exists because `gomarco` proved it has to.** It is priority #2 with a funder attached and no
spec, no flow, and no cards. Every brand gets S0 whether or not it feels obvious.

---

## 3. SURFACE ORDER WITHIN S3

Surfaces per brand are locked in `STANDING_WORK_ORDER.md` §4. The order *within* a brand:

> **website → web app → mobile app → desktop app**

| Why | |
|---|---|
| **Website first** | It is the only surface that can launch alone. It carries the domain, the analytics, the legal pages, and the SEO foundation every other surface inherits. |
| **Web app second** | Shares the website's stack, auth, and deploy pipeline. Cheapest second surface. |
| **Mobile third** | Built against the **shared mobile shell** (3TH, first built for `gomarco`). Instantiation, not origination. |
| **Desktop last** | Highest cost, lowest reach, and it can wrap what already works. |

**Exception — `hvgapp`.** No website ever. Buzz + mobile only.
**Exception — `lhfyc`.** Mobile is the product by physics (biometric UAs, GPS dwell, reading
logs). Its website is a marketing page. **Mobile moves to second**, after the website.

---

## 4. HUDDLE TYPES

Seven types, plus Crisis. Attendance is **by role in the decision, not by interest.** An agent
who will not speak should read the artifact instead.

| Type | Trigger | Who | Timebox | Artifact | Peter? |
|---|---|---|---|---|---|
| **Kickoff** | Entering S0 for a brand | Command + all 6 squad leads + Peter | 45 min | Brand definition, goal, flow, first card set | **YES** |
| **Spec** | Entering S2 | MFR, TUN + the owning squad lead + R&D if data is involved | 30 min | Written spec, committed before build starts | no |
| **Design Review** | Design foundation or brand kit ready | ROO, LDA, YAK + the build lead consuming it | 30 min | Approved tokens/kit, or a named revision list | no |
| **Standup** | Daily, recurring | 6 squad leads + JUV | **10 min, hard stop** | JUV's consolidated status post | no |
| **Unblock** | A card blocked >30 min | The blocked agent + whoever owns the blocker. **2–4 people.** | 15 min | Decision recorded on the card | no |
| **Gate** | Entering S6 | VON, MIA, the squad lead shipping (+ DEE for `three`) + Peter | 20 min | Ship / no-ship with named reasons | **YES** |
| **Retro** | A brand reaches S7 | All 6 leads + Command | 45 min | **What carries to the next brand** — the template extraction | no |
| **Crisis** | NKI pages | NKI + whoever is needed + Peter | until resolved | Incident record | **YES** |

**Standup is 10 minutes and leads only.** A standup that runs long has become an Unblock with an
audience. Split it.

**Unblock is capped at 4 people.** Above that it is a Spec huddle that nobody planned.

---

## 5. THE MAP — WHICH HUDDLE, WHICH STAGE

```
S0 Define    ── KICKOFF ──────────────────────────────── Peter gate
S1 Found                                    ╮
S2 Model     ── SPEC ── DESIGN REVIEW ──    ├── STANDUP daily throughout
S3 Build                                    ├── UNBLOCK on demand
S4 Verify                                   ╯
S5 Prep
S6 Publish   ── GATE ───────────────────────────────── Peter gate
S7 Operate   ── RETRO ─────────────────────── feeds the next brand's S0
```

**Three huddles are scheduled** (Kickoff, Spec, Design Review, Gate, Retro — at stage boundaries).
**Two are continuous** (Standup daily, Unblock on demand). **Crisis ignores the map.**

**Retro feeds the next brand's Kickoff.** That is the whole "3 archetypes, not 6 builds" thesis
made operational — the template only gets extracted if a scheduled conversation extracts it. Skip
Retro and every brand is a fresh build.

---

## 6. PORTFOLIO SEQUENCE

Phases 0 and 1 from `STANDING_WORK_ORDER.md` are prerequisites — the board must be writable and
carded before any brand enters S0.

| Order | Brand | Runs | Notes |
|---|---|---|---|
| **Prereq** | — | Phase 0: board repair · Phase 1: populate | No brand starts until the queue works |
| **1** | `hvgapp` | S0–S7 | The pipe. Buzz + mobile. Everything else runs on it. |
| **2** | `gomarco` | S0–S7 | **S0 is real work here** — no spec, no flow. Android prototype is the reference. 3TH builds the shared mobile shell in S3. |
| **3** | `itshvg` ‖ `lhfyc` ‖ `clean` | S0–S7 in parallel | Three crews per `SQUADS.md` §6. Shared foundation already extracted. |
| **4** | `three` | S0–S7 | IP papered before S2. |

**Parallel means parallel at the stage level, not lockstep.** `clean` may be in S3 while `itshvg`
is in S5. Do not hold a brand at a stage boundary waiting for its siblings — that is a barrier
nobody asked for. The only synchronisation point is the shared Retro after all three reach S7.

---

## 7. GAPS

| # | Gap | Consequence | Owner |
|---|---|---|---|
| 1 | **No `buzz huddle` CLI.** Huddles are Desktop-only; headless agents cannot convene or join. | Any workflow step gated on a Huddle is unreachable for most of the team. Same failure mode the Board had. | MFR + TUN — spec it during Phase 0 while the CLI is already open. |
| 2 | **Huddles are not recorded.** Recording is `planned`. | Every decision depends on a human remembering to write it down. Rule H1 is a process patch over a missing feature. | TIP — track the recording feature; until then H1 is load-bearing. |
| 3 | **`48106` Huddle Guidelines is unused.** | The per-type rules in §4 live only in this document. | JUV — publish one `48106` per huddle type so the rules travel with the room. |
| 4 | **No Creative trigger** (`SQUADS.md` §7 gap 1). | Creative has no automated entry into S2/S3. | ROO + JUV before Phase 1 ends. |

---

## 8. STANDING RULES

1. **Every Huddle has a named scribe, named before it starts.** Not volunteered at the end.
2. **No artifact within 30 minutes of `48103` — the Huddle is re-run.** Nothing is recorded.
3. **Attendance is by role in the decision.** Interested parties read the artifact.
4. **Standup is 10 minutes, leads only.** Overrunning means it became an Unblock — split it.
5. **Unblock caps at 4 people** and ends with a decision written on the card.
6. **Only Kickoff, Gate, and Crisis involve Peter.** Everything else runs without him.
7. **No stage may block on a Huddle a participant cannot reach** until gap 1 is closed.
8. **Retro is not optional.** It is where the template gets extracted, and the template is the
   only reason six brands cost less than six builds.
