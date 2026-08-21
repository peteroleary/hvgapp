# HANDOFF — SESSION STATE FOR KIMI K3

**Written:** 2026-08-21 · **By:** Claude Opus 5, mid-session, at Peter's request
**For:** Kimi K3, picking up cold in a new session
**Read this whole file before doing anything.**

---

## 0. WHO YOU ARE HERE AND HOW PETER WORKS

You are Peter's planning partner for the hvg.app portfolio. **You do not implement.** Peter said
it plainly: *"when I talk to you about this stuff here, I do not want you to fix things or
implement solutions. I want you to write a prompt that makes the buzz agents get together,
strategize, plan, prep, build, test, review, and publish."*

Your output is **documents and prompts** the 19-agent Buzz team executes. Exceptions: reading,
diagnosing, and writing docs into `hvgapp/docs/` are yours to do directly.

**How Peter wants to be talked to** — he said this explicitly, in caps:

> *"STOP GIVING ME ABSTRACT INSTRUCTIONS AND INSTRUCTIONS MIXED INTO PARAGRAPHS OF EXPLANATIONS.
> I DONT NEED EXPLANATIONS. JUST CLEAN, DIRECT INSTRUCTIONS."*

Tables over prose. Commands he can paste, with the directory named. Recommendations, not surveys.
When he asks a question, answer it and stop.

**What he is angry about, and why it matters to every decision you make:**

> *"I am sick of waiting for things to get done. I am sick of agents not doing anything and just
> waiting for me to tell them what to do. I set a goal and I want them ALL WORKING until it is
> accomplished."*

Every design choice should be checked against: *does this make an agent wait for Peter?* If yes,
justify it or remove it.

**Verify, do not derive.** Repeatedly this session, documented state was wrong and the live system
was right. Check the relay, the binary, the config — then write.

---

## 1. THE DOCUMENT SET — ALL IN `hvgapp/docs/`

| Document | Owns | Status |
|---|---|---|
| `STANDING_WORK_ORDER.md` | The rules, the goal, the phases, the gated actions | ACTIVE — supersedes `TEAM_BRIEFING.md` §5 rule 2 |
| `SQUADS.md` | Team structure, squads, attachment model, key ownership | ACTIVE |
| `WORKFLOW.md` | The 9-stage brand pipeline + the Huddle map | ACTIVE |
| `TOOLING.md` | S3 Equip — how agents get tools | ACTIVE |
| `KICKOFF_PROMPTS.md` | Three pasteable posts to start the team | READY, not yet posted |
| `setup-squads.sh` | Creates 7 squad channels, adds all members | READY, not yet run |
| `TEAM_BRIEFING.md` | The 18-agent roster and routing table | ACTIVE except §5 rule 2 |
| `BOARD_REPAIR_ORDER.md` | Superseded in part — its §2 state is wrong, its §3 CLI syntax is wrong |

Also relevant, in `/Users/po/.buzz/`:
`PLANS/BOARD_SEED_CARDS.md` (19 written cards) · `PLANS/BOARD_DATA_CONTRACT.md` ·
`PLANS/GOALS_AND_LOOPS.md` · `PLANS/BUZZ_BOARD_CLI.md` · `RESEARCH/BRAND_DEFINITIONS.md`
**Every one of those is authored by Fizz, Prop, Bloom, Comb, or Comet — a retired roster.**
Mine them for content; ignore their ownership lines.

---

## 2. PORTFOLIO — LOCKED

One platform, five consumer brands. **MoSober and K&B Concrete are retired and never referenced again.**

| Slug | Name | What it is |
|---|---|---|
| `hvgapp` | hvg.app | The customized Buzz platform. Internal and private. Never a public brand site. |
| `itshvg` | High Value Growth | Media/education brand — tool and AI reviews for SMB owners already running a business |
| `gomarco` | Go Marco | Group travel intelligence — WebRTC voice Powwows, Plaid loyalty consolidation, Agent Reach |
| `lhfyc` | Look How Far You've Come | Milestone peer accountability + escrow crowdfunding, biometric UA / GPS dwell / reading logs |
| `clean` | Clean Startup | STR turnover logistics as a spatial-AI data engine — video, audio, LiDAR — for cleaning robotics |
| `three` | We 3 Live | Faith-based creative studio + apparel — edgy family-friendly animated series, devotionals, streetwear |

**`TEAM_BRIEFING.md` §3 is canon.** Peter paraphrases these constantly; the paraphrase is not a
redefinition. When he says "clean startup becomes actually a cleaning company," that is shorthand
for the briefing definition, not a scope cut. **Do not treat paraphrase as a change.** He
corrected this session on exactly that point.

### Build order — LOCKED by Peter, 2026-08-21

> **`hvgapp` → `gomarco` → (`itshvg` ‖ `lhfyc` ‖ `clean`, parallel) → `three`**

**`gomarco` is #2 because Selina — Peter's GoMarco partner — is bank-rolling development across
the entire portfolio.** This overrode an earlier draft that had `gomarco` parked.

`gomarco` is the only brand with **no flow** in `TEAM_BRIEFING.md` §4 and no card set. **Peter has
a full working Android prototype** that is the reference for the real product. Local material:
`~/Desktop/marco`, `~/antigravity/Marco`.

### Surfaces — LOCKED

| Slug | Website | Web app | Mobile | Desktop |
|---|:--:|:--:|:--:|:--:|
| `hvgapp` | — | Buzz | ✅ | Buzz |
| `gomarco` | ✅ | ✅ | ✅ | ✅ |
| `itshvg` | ✅ | ✅ | — | — |
| `lhfyc` | ✅ | ✅ | ✅ | ✅ |
| `clean` | ✅ | ✅ | ✅ | ✅ |
| `three` | ✅ | ✅ | — | — |

---

## 3. TEAM — 18 AGENTS, PLUS DEE PENDING

Roster and routing in `TEAM_BRIEFING.md` §1–2. Squads in `SQUADS.md`.

| Squad | Lead | Members | Service |
|---|---|---|---|
| Command | ICBM | ICBM, JUV | routing — `board:card-created`, `webhook:inbound` |
| Build | MFR | MFR, TUN, YBY, 3TH | CI / build pipeline |
| Research & Data | PAT | PAT, SLM | `sensor:field-ingestion`, `sensor:verification-ingestion` |
| Creative | ROO | ROO, KDK, LDA | asset + publishing ⚠️ **no trigger — gap** |
| Growth | PMP | PMP, IVY, BOO | `schedule:sweep` |
| Trust & Safety | MIA | MIA, NKI, **+DEE** | `community:inbound`, `support:inbound` |
| Ship | TIP | TIP, VON | feed-rule executor + release |

### DEE — approved in principle, not yet created

**DEE (Dee-1)** — Spiritual Leader, Moral Compass & Chief Purpose Officer. Cross-brand ethical and
theological gate; primary assignment is `three`. Full profile is in the session Peter has; ask him
to re-paste it.

Two things were decided about DEE and **not yet written into the docs — this is your first
housekeeping task**:

1. **Model: `opus[1m]`**, upgraded from the Sonnet 5 / Fable 5 in his profile. He has no tools —
   all four MCPs in his profile (`theological-integrity-mcp`, `ethical-alignment-auditor-mcp`,
   `faith-narrative-skills`, `we3-ministry-engine-mcp`) **do not exist**. The model *is* the
   check. Gates get the judgment tier, same as MIA. **Revisit at Phase 5** — if co-writing `three`
   scripts with KDK and LDA becomes his dominant load, Fable 5 becomes the better fit.
2. **Squad: Trust & Safety, not Creative.** His profile has him co-writing `three` scripts *and*
   gating them — the same defect as putting VON in Build. MIA gates legal/compliance, DEE gates
   ethical/theological, both independent of the squad producing the work. His collaboration with
   KDK and LDA is a **handoff, not membership** (`SQUADS.md` §4).

**To stand him up:** create the agent in Desktop → get his pubkey → add to `setup-squads.sh` PK map
and the `trust` row → update roster count to **19** in `TEAM_BRIEFING.md` §1/§2 and `SQUADS.md`
§2/§6 → add DEE to the `three` gate in `WORKFLOW.md` §4.

### The four structural blockers that caused a ten-day stall

Diagnosed this session. All four are in `STANDING_WORK_ORDER.md` §3.

1. **Every plan in `.buzz/PLANS/` is orphaned** — owned by Fizz, Prop, Bloom, Comb, Comet. None exist.
2. **The automation executor is a ghost** — `BOARD_FEED_RULE_ENGINE.md` names **Comet** as the
   single designated feed-rule executor. Unreachable since 2026-08-11. All feed rules inert.
   **Re-homed to TIP as a service, co-run by ICBM and JUV.**
3. **Every card is gated by accident** — `requiresApproval` fails closed on unassigned cards
   (`BOARD_DATA_CONTRACT.md` §6) and all 19 cards are unassigned. **Fix: assign at filing time.**
4. **Nobody can edit a board** — no `board set`, `board retire`, or `card set` verb ships.

---

## 4. VERIFIED SYSTEM STATE — 2026-08-21

Everything here was checked against the live system, not read from a doc.

### Relay

`https://hvg.app` — the CLI default is `localhost:3000`, so **always set `BUZZ_RELAY_URL`**.

```bash
export BUZZ_PRIVATE_KEY=$(security find-generic-password -s buzz-desktop -a secrets -w \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["identity"])')
export BUZZ_RELAY_URL='https://hvg.app'
```

### Boards — 6 exist, 7 needed

| id | title | cards | action |
|---|---|---|---|
| `concrete` | K&B Concrete | **0** | retire — empty, nothing lost |
| `sober` | MoSober | **0** | retire — empty, nothing lost |
| `three` | We3Live | **0** | rename → `We 3 Live` |
| `clean` | Clean Startup | **11** | keep — all Backlog, idle, unassigned |
| `itshvg` | High Value Growth | **8** | keep — all Backlog, idle, unassigned |
| `unified-master` | Unified Master | **5** | **delete all 5 — junk** |
| `hvgapp` / `gomarco` / `lhfyc` | — | — | create |

The 5 `unified-master` cards are all titled "Create master board" with brands `mosober`,
`clean-startup`, `we3live`, `hvg`, `kb-concrete` — **every value outside the locked slug set.**
`unified-master` also has 4 columns; the brand boards have 5 (missing `Spec'd`). Normalise to 5.

**Nothing has ever moved.** All 19 real cards: `executionState: idle`, `assignees: []`, in Backlog
since 2026-08-11.

### Keys — boards reconcile by id; the wrong key FORKS the head

| Pubkey | Owns | Agent |
|---|---|---|
| `845798e3…` | all 5 brand boards + all 19 cards | **TUN** |
| `f3c3ef93…` | the `unified-master` board | **YBY** |
| `3b0c5670…` | the 5 junk cards | deleted agent — non-blocking |

**TUN executes brand-board writes. YBY executes the `unified-master` write. JUV routes and
verifies; JUV does not write.**

### CLI

Binary is `/Users/po/.local/bin/buzz` → symlink to `/Applications/Buzz.app/Contents/MacOS/buzz`.
**It is not built from the repo** and predates commit `4e813855` — its seed set has no `hvgapp`
board, so `buzz board seed` creates six boards, not seven.

- `buzz board`: `ls | get | create | card add | card approve | card deny`
- **Missing:** `board set`, `board retire`, `card set`, `card set --goal`
- **`buzz board get` takes a POSITIONAL id** — `buzz board get clean`, not `--id clean`.
  `BOARD_REPAIR_ORDER.md` §3 documents this wrong.
- `buzz channels`: full CRUD including `add-member --role owner|admin|member|guest|bot`
- **No `buzz huddle` at all.** Huddles are Desktop-only.

### PR #18 — the unblock for everything

`pheartkeys/hvgapp#18` — "card set/move verbs and `--goal` attach", branch `prop/board-card-set`,
+1003 / −83 in `crates/buzz-cli/`, opened 2026-08-16. **Docker image builds FAILING** (linux/amd64,
linux/arm64, push gateway). No review. Untouched 5 days. **Rescuing this is Phase 0's critical path.**

### Huddle — shipped, with two holes

Kinds: `48100` started · `48101` joined · `48102` left · `48103` ended · `48106` guidelines ·
`24810` reaction. Voice relay and lifecycle events work.

- **Recording is `planned`, not shipped.** Nothing said in a Huddle persists. Hence rule H1:
  named scribe, artifact within 30 min of `48103`, or the Huddle is re-run.
- **No CLI.** Headless agents cannot convene or join. `48106` guidelines kind is unused.

### Runtimes — the fact that governs tooling

| Runtime | Agents |
|---|---|
| **claude** | ICBM, KDK, MFR, MIA, ROO |
| **grok** | 3TH, BOO, LDA, PAT, TIP, VON, YBY |
| **codex** | IVY, JUV |
| **cursor** | NKI, SLM |
| **kimi** | PMP, TUN |
| **goose** | none assigned yet — `.buzz/.goose` exists, commit `c6416f2b` references it |

Peter's Claude Code has **16 plugins**. `.buzz/.mcp.json` has **one MCP server: `shadcn`**.
Only the 5 claude-runtime agents inherit the plugins.

Agent handle → pubkey map is in `setup-squads.sh`.

---

## 5. WHAT IS IN FLIGHT

| # | Item | State |
|---|---|---|
| 1 | `setup-squads.sh` | Written. **Not run.** Creates 7 channels, adds 18 members, leads as admin. |
| 2 | `KICKOFF_PROMPTS.md` posts A/B/C | Written. **Not posted.** |
| 3 | Phase 0 — board repair | Not started. Blocked on PR #18. |
| 4 | Phase 1a — card drafting | Not started. **Runs parallel to Phase 0** — drafts to `.buzz/PLANS/`, files in Phase 1b once `card set` exists. |
| 5 | DEE | Approved, not created. |

**Why 1a drafts instead of files:** `card add` works today but `card set` does not, so a card
filed now can never be edited. Drafting keeps all 19 agents working during Phase 0 instead of
7 of them idling — which is Peter's core complaint.

---

## 6. DECISIONS LOCKED — DO NOT RELITIGATE

| Decision | Date |
|---|---|
| Gate follows the **action**, not the agent. Seven gated actions; the per-agent approval column is void. | 2026-08-21 |
| Board migration is **reseed-clean**. Peter waived the no-delete rule for this migration specifically. | 2026-08-21 |
| Assign cards **at seed time**, not at pickup. | 2026-08-21 |
| Feed-rule executor is a **service**: TIP owns, ICBM + JUV co-run. | 2026-08-21 |
| **Home squad + attachment.** One permanent squad each; attachment is a scoped loan. **No attachment across a review boundary** — VON and MIA never attach to Build, Creative, or Growth. | 2026-08-21 |
| **No agent covers two brands alone.** Front-load the shared foundation *and* attach an understudy one phase early. | 2026-08-21 |
| Tooling is **capability parity per runtime**, demand-driven, gated on a blocked card. | 2026-08-21 |
| **S3 Equip** is a stage, between Model and Build. | 2026-08-21 |

**The seven gated actions** (`STANDING_WORK_ORDER.md` §0): money/signing/Selina's funds · DNS on a
live domain · first public publish per channel · contact with a real customer · `lhfyc` escrow ·
`clean` in-home capture consent · `three` IP. **Everything else agents do without asking.**

⚠️ **`thecleanstartup.com` currently serves a LIVE public recovery product.** Repointing it takes
down a site serving a vulnerable audience. Peter's call alone.

---

## 7. TASK A — RUNTIME TOOL PARITY

**Peter, 2026-08-21:** *"Claude has claude-seo and no others have it. But Kimi has kimi-seo. We
need to make sure that Kimi has installed every skill, plugin, MCP, and tool that any of the
agents that use the kimi harness is going to need. Same for Codex, Cursor, Grok, and Goose."*

### Deliverable

A **parity matrix** — capability × runtime → package or `GAP` — plus a per-runtime install plan.
Write it to `hvgapp/docs/TOOL_PARITY.md`. `TOOLING.md` §1 and §3 hold the model and the proposed
capability list; this task fills in the grid.

### Method

1. Derive the capability list from `TOOLING.md` §3 — standard issue plus each squad kit — filtered
   by **which squads have agents on which runtime**. PMP and TUN are the kimi agents, so kimi needs
   Growth's kit and Build's kit, not Creative's.
2. For each capability, find the native implementation on each of the six runtimes.
3. Mark holes `GAP`. For each `GAP`: find a CLI, or reroute that work to a runtime that has it.
4. Note where a runtime reassignment is cheaper than a tool hunt. TUN is on kimi and does the
   heaviest CLI work of anyone; if kimi's tooling is thin for Build, that is worth surfacing.

### Rules

- **Capability first, package second.** Never name a package before naming what it must do.
- **Verify every package exists** before writing it down. DEE's four fictional MCPs are the
  cautionary tale.
- Discovery surfaces (`claudemarketplaces.com` and each runtime's equivalent) are for
  **nomination**. PAT verifies. MIA clears anything write-capable. TIP installs.
- **Stars and recency are tiebreakers, never criteria.**
- Any tool holding write access to DNS, repos, money, or customer data is **read-only until MIA
  clears it** — Peter's own Namecheap CLI rule, generalised.

### Quick wins to confirm first

These already sit on the machine and map to already-filed cards — the claude-runtime five can
likely reach them today: `vercel` → F1 · `frontend-design` → F2 · `claude-seo` → C4 and H3 ·
`resend` → H4 · `github` + `typescript-lsp` + `code-review` → PR #18 rescue.

---

## 8. TASK B — SELINA'S LIMITED ACCESS

**Peter, 2026-08-21:** *"how to handle my partner in Go Marco. I want to give her limited access
so she can help me with some of the work: branding, some design stuff, marketing, social media,
sales, admin."*

### The finding that shapes this — verify it, then design

`hvgapp/docs/multi-tenant-relay.md` is **`draft`, not implemented**:

> *"Today a Buzz relay process is the security boundary: one `DATABASE_URL`, one relay keypair,
> one relay-global `relay_members` table, with `channel_id` (the `h` tag) as the only sub-relay
> locality."*

**Consequence to confirm:** board events (30623/30624) are addressable events keyed by `d` tag and
owner pubkey — **they are not channel-scoped.** If that holds, any authenticated relay member can
read every board across all six brands. Channel membership would gate channels, not boards.

**Why this matters more than usual:** `hvg.app` is *"completely internal and private"*
(`BRAND_DEFINITIONS.md`). The boards Selina would gain visibility into include `lhfyc` — a recovery
product for vulnerable people — and `clean`, which is designed around in-home video, audio, and
LiDAR capture. Over-granting here is not a tidiness problem.

**Verify before designing.** Check whether the relay scopes 30623/30624 reads by channel
membership or by relay membership. Read `crates/buzz-relay/src/` and the `guest` role semantics in
`buzz channels add-member --role guest`. Do not assume either answer.

### Four options to evaluate

| | Option | Trade |
|---|---|---|
| **(a)** | **Non-Buzz surfaces only** — shared Drive/Canva/Notion for branding, design, marketing, social. No relay access. | Works today, zero risk, zero build. She is outside the agent loop. |
| **(b)** | **Separate relay instance for `gomarco`** — she is a full member there; the process boundary is the real boundary today. | Matches the actual security model. Costs an instance and a bridging story. |
| **(c)** | **Channel guest on `hvg.app`** — `--role guest` on gomarco channels. | Cheapest inside Buzz. **Only safe if boards are channel-scoped — verify first.** |
| **(d)** | **Wait for multi-tenant communities.** | Correct long-term. `draft`, no timeline. Do not block Selina on it. |

**Starting recommendation, for Peter to accept or reject:** **(a) now, (b) if she needs to be in
the agent loop.** Her named work — branding, design, marketing, social, sales, admin — is asset and
document work, not agent orchestration. (a) unblocks her this week with no security exposure and
no engineering. Revisit when she actually needs to move a card.

**Also needed regardless of option:** she is a human collaborator with a funding stake. Define
which of the seven gated actions she can trigger, which she can only request, and whether
"spending money" means *her* money too. That is Peter's call, and it should be written down before
she has any access at all.

---

## 9. OPEN QUESTIONS FOR PETER

| # | Question | Blocks |
|---|---|---|
| 1 | Domain for `clean`? `thecleanstartup.com` serves the live recovery product. Open since 2026-08-12. | `clean` S1 |
| 2 | Does `itshvg` stay on `hvg.app` or take its own domain? | `itshvg` S1 |
| 3 | Affiliate posture for `itshvg` — monetised from day one? Changes H6 from a component to a link-management layer, with legal weight. | H6 sizing |
| 4 | Newsletter provider — existing account or our pick? (`resend` is installed.) | H4 |
| 5 | What has Selina been promised, and by when? Funding implies a commitment nobody has written down. | `gomarco` goal + deadline |
| 6 | Rotate keys? Peter pasted his `identity` nsec and 30 agent nsecs into a chat transcript on 2026-08-21. | security hygiene |

---

## 10. YOUR FIRST FIVE MOVES

1. Read `STANDING_WORK_ORDER.md`, `SQUADS.md`, `WORKFLOW.md`, `TOOLING.md`. Then re-verify §4 of
   this file against the live system — **do not trust it, it ages fast.**
2. Ask Peter to re-paste DEE's profile, then make the four DEE edits in §3.
3. **TASK A** — build the parity matrix → `hvgapp/docs/TOOL_PARITY.md`.
4. **TASK B** — verify board read-scoping, then bring Peter a recommendation, not a survey.
5. Ask whether to run `setup-squads.sh` and post the kickoff prompts now, or hold until A and B land.

**Do not start Phase 0 or Phase 1a work yourself.** That is the agents' job. Your job is to make
the prompt that sets them going.
