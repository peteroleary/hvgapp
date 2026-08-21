# SQUADS — TEAM STRUCTURE

**Companion to:** [`STANDING_WORK_ORDER.md`](./STANDING_WORK_ORDER.md) · **Roster source:** [`TEAM_BRIEFING.md`](./TEAM_BRIEFING.md) §1–§2
**Status:** ACTIVE. Supersedes any earlier grouping of the roster.

---

## 1. VOCABULARY

| Term | Meaning |
|---|---|
| **Team** | All 19 agents. One team, always. |
| **Squad** | A standing group with a shared capability, a lead, and one service it runs. Six squads. |
| **Command** | ICBM + JUV. Not a squad — they route across squads and own the goal. |
| **Home squad** | Every agent has exactly one. Permanent. |
| **Attachment** | Temporary loan of an agent to another squad, scoped to one phase or one brand. |

---

## 2. THE SIX SQUADS

| Squad | Lead | Members | Service it runs |
|---|---|---|---|
| **Command** | ICBM | ICBM, JUV | Routing — `board:card-created`, `webhook:inbound` |
| **Build** | MFR | MFR, TUN, YBY, 3TH | CI / build pipeline |
| **Research & Data** | PAT | PAT, SLM | Ingestion — `sensor:field-ingestion`, `sensor:verification-ingestion` |
| **Creative** | ROO | ROO, KDK, LDA | Asset + publishing pipeline ⚠️ *no trigger yet — §7* |
| **Growth** | PMP | PMP, IVY, BOO | Search sweep — `schedule:sweep` |
| **Trust & Safety** | MIA | MIA, NKI, DEE | Inbound — `community:inbound`, `support:inbound` |
| **Ship** | TIP | TIP, VON | Feed-rule executor + release |

19 agents. Command is 2. Six squads hold 17.

**Six of the seven services already exist** as inbound sources in `TEAM_BRIEFING.md` §2. The
routing table was already squad-shaped; nobody had named it. Only Ship's feed-rule executor is
new — it is the re-homing of Comet's abandoned role (`BOARD_FEED_RULE_ENGINE.md` decision #1).

---

## 3. WHY THESE LINES

**Squads are function-based, not brand-based.** Phase 4 runs `itshvg` ‖ `lhfyc` ‖ `clean`
simultaneously. Six brand-squads of three agents each cannot cover nine tracks per brand.
**Squads get assigned to brands; they never own them.**

**Reviewers are never in the squad they review.** VON and MIA sit outside Build by construction.
That is the entire reason Ship and Trust & Safety are separate squads rather than Build members.
If the tester reports to the build lead, "done" means whatever the build lead needs it to mean.

**Every squad runs a service.** A squad that only responds to human routing goes quiet without
anyone noticing. A squad that runs a service has a heartbeat.

---

## 4. HOME SQUAD + ATTACHMENT

Exclusive membership was half right. It protects independent review and single accountability.
It was wrong for four agents whose real work already crosses a squad line every flow:

| Agent | Home | Also does | Evidence |
|---|---|---|---|
| **ROO** | Creative | Build — "Design System & UI Spec" mid-flow | Platform Build Flow: MFR & TUN → **ROO** → YBY |
| **SLM** | Research & Data | Build — "Optimization Pass" | Platform Build Flow: YBY → **SLM** → BOO |
| **BOO** | Growth | Build — "Search & Schema Sweep", hands back to MFR/TUN | Platform Build Flow + BOO handoff row |
| **PAT** | Research & Data | Creative — the benchmark *is* the content for `itshvg` | HVG Review Flow: **PAT** → KDK → LDA |

**The rules:**

| | Rule |
|---|---|
| **Home squad** | Exactly one, permanent. Owns the agent's accountability and daily status line. |
| **Attachment** | Temporary, named, scoped to one phase or one brand. The attaching lead borrows capacity; **the home lead still owns accountability.** |
| **Hard limit** | **No attachment across a review boundary.** VON and MIA never attach to Build, Creative, or Growth. Ever. |
| **Cap** | One attachment at a time. An agent attached twice is unassigned with extra steps. |
| **Ending it** | An attachment ends when its phase ends. It does not roll over silently — the attaching lead re-requests or the agent goes home. |

**Crossing ≠ membership.** Every flow in `TEAM_BRIEFING.md` §4 crosses four or five squads.
That is a handoff, not an attachment. Attach only when an agent is doing *sustained* work inside
another squad's function, not when they receive one handoff and pass it on.

---

## 5. SQUAD CHARTERS

### Command — ICBM (lead), JUV
**Purpose.** Own the goal. Route work. Keep the board true.
**Runs.** Routing service: `board:card-created`, `webhook:inbound`.
**Delivers.** The daily consolidated status in `#build` (JUV). Goal definitions and the priority
stack (ICBM). Every card assigned at filing time.
**Does not.** Build, design, or review. Command that writes code stops routing.
**Escalates to.** Peter, and only for the seven gated actions in `STANDING_WORK_ORDER.md` §0.
**Known risk.** JUV is the single router for 16 agents. First bottleneck after the board is fixed.

### Build — MFR (lead), TUN, YBY, 3TH
**Purpose.** Architecture, scaffolding, implementation, mobile. Everything that compiles.
**Runs.** CI / build pipeline.
**Delivers.** Specs before code (MFR + TUN). Implementation (YBY). Mobile surfaces (3TH).
**Key holder.** **TUN holds `845798e3…`** — the key that wrote every brand board and all 19
cards. Board writes must come from TUN or the head forks. See §8.
**Does not.** Declare its own work done. VON does that.
**Hands off to.** Ship (VON tests, TIP releases), Trust & Safety (MIA reviews anything touching
user data, money, or a real person).

### Research & Data — PAT (lead), SLM
**Purpose.** Verified facts and processed signal. Nothing in this squad ships an opinion.
**Runs.** Ingestion: `sensor:field-ingestion`, `sensor:verification-ingestion`.
**Delivers.** Hands-on benchmarks (PAT). Spatial processing, tamper-proof validation,
optimization passes (SLM).
**Standing rule.** Cite sources with dates. No claim without a path, link, or reference.
**Appears in.** Clean Ingestion Flow (both), lhfyc Escrow Flow (both), HVG Review Flow (PAT),
Platform Build Flow (SLM).

### Creative — ROO (lead), KDK, LDA
**Purpose.** Brand identity, voice, and produced media. What the audience actually sees.
**Runs.** Asset + publishing pipeline. ⚠️ **Has no automated trigger today — §7.**
**Delivers.** Design foundation and brand kits (ROO). Scripts, review copy, messaging (KDK).
Video, animatics, hooks, trend scouting (LDA).
**Gate.** First public publish per channel needs Peter. After that, publish freely.

### Growth — PMP (lead), IVY, BOO
**Purpose.** Revenue and reach. Everything downstream of a working product.
**Runs.** Search sweep: `schedule:sweep`.
**Delivers.** Partnerships and B2B (PMP). Commerce, merch, unit economics (IVY). SEO, GEO, AI
search, schema (BOO).
**Gate.** Spending money and signing anything needs Peter.

### Trust & Safety — MIA (lead), NKI, DEE
**Purpose.** Protect the user and the business. Independent of everyone they review.
**Runs.** Inbound: `community:inbound`, `support:inbound`.
**Delivers.** Security, privacy, compliance review (MIA). Community, support triage, moderation,
crisis paging (NKI). Ethical and theological review, `three` stewardship (DEE).
**DEE.** Model `opus[1m]`, no tools — the model is the check (`TEAM_BRIEFING.md` §1). His
co-writing with KDK and LDA on `three` scripts is a handoff, not membership.
**Independence.** **Never attaches to Build, Creative, or Growth.**
**Standing rule.** Crisis outranks everything. NKI pages Peter immediately and does not wait.
**Owns the gates on.** `lhfyc` escrow, `clean` in-home capture consent, `three` IP (MIA legal/compliance, DEE ethical/theological).

### Ship — TIP (lead), VON
**Purpose.** The last gate. Nothing reaches a user without passing through here.
**Runs.** Feed-rule executor + release pipeline. **Co-run with ICBM and JUV** per the Q8 ruling —
the executor is a service with three owners, never one agent. Comet's failure mode does not
repeat.
**Delivers.** Test and verification (VON). Release, infrastructure, builds (TIP).
**Independence.** **Never attaches to Build.** VON verifies Phase 0 done, not JUV, not the author.

---

## 6. ATTACHMENT MATRIX BY PHASE

Home squad in **bold**. `→` means attached for that phase only.

| Agent | Home | Ph 0 · Board repair | Ph 1 · Populate | Ph 2 · `hvgapp` | Ph 3 · `gomarco` | Ph 4 · 3 brands ‖ | Ph 5 · `three` |
|---|---|---|---|---|---|---|---|
| ICBM | **Command** | Command | Command | Command | → Growth *(Selina)* | Command | Command |
| JUV | **Command** | Command | Command | Command | Command | Command | Command |
| MFR | **Build** | Build | Build | Build | Build | Build | Build |
| TUN | **Build** | **Build — key holder** | Build | Build | Build | Build | Build |
| YBY | **Build** | Build | Build | Build | Build *(**pairs on mobile**)* | Build *(`lhfyc`, incl. mobile)* | Build |
| 3TH | **Build** | — | Build | Build | Build *(**builds mobile shell**)* | Build *(shell owner, both brands)* | — |
| PAT | **R&D** | R&D *(diagnose)* | R&D | R&D | R&D | → **Creative** *(`itshvg`)* | R&D |
| SLM | **R&D** | → **Build** | R&D | → **Build** | R&D | R&D | R&D |
| ROO | **Creative** | → **Build** | Creative *(**foundation, all brands**)* | → **Build** | Creative | Creative *(`lhfyc`)* | Creative |
| KDK | **Creative** | — | Creative | Creative | Creative | Creative *(`itshvg`)* | Creative |
| LDA | **Creative** | — | Creative | → **Build** *(understudy)* | Creative | Creative *(`clean`)* | Creative |
| PMP | **Growth** | — | Growth | Growth | **Growth** *(Selina)* | Growth | Growth |
| IVY | **Growth** | — | Growth | Growth | Growth | Growth | Growth |
| BOO | **Growth** | — | Growth | → **Build** | Growth | Growth | Growth |
| MIA | **Trust** | Trust | Trust | Trust | Trust | Trust | **Trust** *(IP gate)* |
| NKI | **Trust** | — | Trust | Trust | Trust | Trust | Trust |
| TIP | **Ship** | **Ship** | Ship | Ship | Ship | Ship | Ship |
| VON | **Ship** | **Ship** *(verifies done)* | Ship | Ship | Ship | Ship | Ship |
| DEE | **Trust** | — *(not yet created)* | Trust | — | — | Trust | **Trust** *(`three` gate)* |

**Phase 4 brand split.** Three brands in parallel, squads split across them:

| Brand | Build | Creative | Growth | R&D | Trust | Ship |
|---|---|---|---|---|---|---|
| `itshvg` | TUN | KDK | BOO | **PAT** *(attached to Creative)* | — | VON |
| `lhfyc` | YBY, 3TH *(shell)* | ROO | — | SLM | **MIA** *(escrow gate)* | VON |
| `clean` | MFR, 3TH *(shell)* | LDA | IVY | SLM | **MIA** *(consent gate)* | VON |

**Nobody covers two brands alone.** The earlier draft had ROO doing design for both `lhfyc` and
`clean`, and 3TH doing mobile for both. That was a planning error, not a staffing problem — and
the fix is applied one to three phases upstream, not on the day it breaks.

### How the two pressure points were relieved

| Pressure | Front-load | Understudy |
|---|---|---|
| **ROO — design ×2 brands** | The design foundation (tokens, type scale, spacing, logo slot) is built **once in Phase 1 for all brands**, not per-brand in Phase 4. Phase 4 design is instantiation against a template, not origination. | **LDA attaches to Build in Phase 2** and learns the design-system work while the stakes are internal. In Phase 4 LDA owns `clean` design; ROO owns `lhfyc`. |
| **3TH — mobile ×2 brands** | `gomarco` is the first mobile build (Phase 3). 3TH builds a **shared mobile shell** there, reused by `lhfyc` and `clean`. Three mobile apps, one architecture. | **YBY pairs with 3TH on `gomarco` mobile in Phase 3.** In Phase 4 YBY runs `lhfyc` mobile against the shell; 3TH owns the shell itself and reviews both instantiations rather than building both. |

`itshvg` loses LDA and keeps KDK. Correct trade: `itshvg` is website + web app with no mobile,
its launch-blocking need is review copy (KDK), and LDA's video work for it is post-launch content.

**VON still covers all three.** Testing does not parallelise by adding testers, it parallelises
by testing smaller things. That is Ship's problem to solve — §7 gap 4.

---

## 7. GAPS THIS STRUCTURE EXPOSES

| # | Gap | Consequence | Owner |
|---|---|---|---|
| 1 | **Creative has no automated trigger.** Every other squad has an inbound source; ROO/KDK/LDA only move when a human routes to them. | Content stalls silently — nothing distinguishes "idle" from "nothing assigned". | ROO + JUV define one before Phase 1 ends. |
| 2 | **`gomarco` has no flow** in `TEAM_BRIEFING.md` §4 — the only brand without one, and it is priority #2. | No squad has a defined path through it. | ICBM + PMP, before Phase 3. |
| 3 | **JUV is the sole router for 16 agents.** | First bottleneck once the board works. | ICBM — decide whether routing splits by squad or stays central. **Apply rule 8: name JUV's understudy in Phase 1, not Phase 4.** |
| 4 | **Ship is 2 agents gating all six brands.** | VON becomes the queue in Phase 4. | TIP — decide what VON delegates and what he never delegates. Rule 8 applies: front-load the test harness so Phase 4 testing is running suites, not writing them, and name VON's understudy by Phase 2. **Constraint: the understudy cannot come from Build, Creative, or Growth** (rule 3), which makes NKI or TIP the only candidates. |

---

## 8. KEY OWNERSHIP — READ BEFORE ANY BOARD WRITE

Boards reconcile by id. **Writing from the wrong key forks the head instead of updating it.**

| Pubkey | Owns | Agent |
|---|---|---|
| `845798e3…` | All 5 brand boards + all 19 cards | **TUN** |
| `f3c3ef93…` | The `unified-master` board | **YBY** |
| `3b0c5670…` | The 5 junk cards on `unified-master` | unidentified — cards are being deleted, does not block |

**Phase 0 migration writes execute from TUN's key.** JUV routes and verifies; JUV does not write.
**The `unified-master` column normalisation is YBY's write**, not TUN's — different key, different
board. `STANDING_WORK_ORDER.md` §5 has been corrected to match.

---

## 9. STANDING RULES FOR SQUADS

1. **One home squad. One lead. One daily status line.**
2. **Attachment is a loan, not a transfer.** The home lead still owns accountability.
3. **No attachment across a review boundary.** VON and MIA never attach to Build, Creative, or Growth.
4. **A squad that stops running its service is offline**, whatever its members are doing.
5. **Squads are assigned to brands. They never own them.**
6. **Handoffs cross squads constantly and that is normal.** Attach only for sustained work inside
   another squad's function.
7. **Nobody declares their own work done.** VON does. MIA gates anything touching user data,
   money, or a real person.
8. **No agent covers two brands alone.** If the matrix puts one agent on the same function for
   two brands in the same phase, that is a planning error. Fix it upstream, two ways together:
   **front-load** the shared foundation so the second brand is instantiation rather than
   origination, and **attach a named understudy one phase early** so they arrive trained rather
   than onboarding under load. Adding a body on the day it breaks is not help, it is a second
   person who does not know the system.
9. **Anticipated overload gets scheduled out, never absorbed.** "They'll manage" is how a
   forecast becomes an incident.
