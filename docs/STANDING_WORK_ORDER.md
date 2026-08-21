# STANDING WORK ORDER — REBUILD THE BOARDS, THEN SHIP THE PORTFOLIO

**Issued by:** Peter · **Scope:** all brands · **Supersedes:** `TEAM_BRIEFING.md` §5 rule 2
**Status:** STANDING until the last brand is live.

Read it all. Then convene. Do not start writing code.

---

## 0. THE RULE THAT CHANGED

**You no longer stop and wait for me.**

`TEAM_BRIEFING.md` §5 rule 2 is retired. Your `Needs Peter's approval` column is void.
**The gate follows the action, not the agent.** Seven things require me:

| Gated | |
|---|---|
| 1 | Spending money, signing anything, committing Selina's funds |
| 2 | DNS changes on any live domain — `thecleanstartup.com` currently serves the live recovery product |
| 3 | The **first** public publish under a brand name, per channel. After that, publish freely |
| 4 | Any contact with a real customer, host, or user — including test email to a real address |
| 5 | `lhfyc` escrow / money movement |
| 6 | `clean` in-home capture consent posture |
| 7 | `three` IP assignment, master ownership, syndication |

**Everything else you do without asking.** Filing, assigning, moving cards, specs, code, PRs,
reviews, merges, builds, design, copy, internal tooling.

If you are about to ask me something not on that list: answer it yourself and record the
assumption on the card.

**You may not idle.** Blocked is not a resting state. Escalate per routing within 30 minutes,
then pick up the next card. Same error twice, hand back with what you tried.

---

## 1. THE GOAL

> Seven correct boards, fully carded and assigned, and every brand's surfaces built, tested,
> reviewed and published in the order in §4.

Done when a stranger can reach each brand's live site and `hvg.app` runs the operation without me.

---

## 2. RELAY STATE — VERIFIED 2026-08-21, DO NOT RE-DERIVE

Diagnosed against the live relay. These are facts, not the code-derived guesses in
`BOARD_REPAIR_ORDER.md` §2.

| Board id | Title | Cards | Action |
|---|---|---|---|
| `concrete` | K&B Concrete | **0** | retire — empty, nothing lost |
| `sober` | MoSober | **0** | retire — empty, nothing lost |
| `three` | We3Live | **0** | rename → `We 3 Live` |
| `clean` | Clean Startup | **11** | keep |
| `itshvg` | High Value Growth | **8** | keep |
| `unified-master` | Unified Master | **5** | **delete all 5 cards** |
| `hvgapp` | — | — | create |
| `gomarco` | — | — | create |
| `lhfyc` | — | — | create |

**Four facts that shape the repair:**

1. **The reseed is nearly free.** Both retired boards are empty. The 19 real cards on
   `clean`/`itshvg` reproduce verbatim from `SEED_CARDS` in `crates/buzz-cli/src/commands/board.rs`.
2. **`unified-master`'s 5 cards are junk** — all titled "Create master board", description
   "Feeds Unified Master", brands `mosober` / `clean-startup` / `we3live` / `hvg` / `kb-concrete`.
   **Every one is outside the locked slug set.** Delete them.
3. **Three owner keys.** Brand boards + their cards → `845798e3…` = **TUN**. `unified-master`
   board → `f3c3ef93…` = **YBY**. `unified-master` cards → `3b0c5670…` = unidentified, and those
   cards are being deleted so it does not block. Boards reconcile by id — **write from the
   original key or you fork the head instead of updating it.**
4. **Nothing has ever moved.** All 19 cards are `executionState: idle`, `assignees: []`, in
   Backlog since 2026-08-11. Column schema is also inconsistent: brand boards have 5 columns
   (Backlog / Spec'd / In Progress / In Review / Done), `unified-master` has 4 (no Spec'd).
   Normalise to 5.

**Corrections to the docs, apply them:**
- `buzz board get` takes a **positional** id — `buzz board get clean`, not `--id clean`.
  `BOARD_REPAIR_ORDER.md` §3 documents it wrong.
- Relay is `https://hvg.app`. CLI default is `localhost:3000` — always set `BUZZ_RELAY_URL`.

---

## 3. FOUR THINGS THAT WILL STOP YOU

1. **Every plan in `.buzz/PLANS/` is orphaned.** Owned by **Fizz, Prop, Bloom, Comb, Comet** —
   none exist on the current roster. **Remap every owner to a live handle first**, or you are
   reading instructions addressed to ghosts.

2. **The automation executor is a ghost.** `BOARD_FEED_RULE_ENGINE.md` decision #1 names
   **Comet** as the single designated feed-rule executor. Unreachable since 2026-08-11. Every
   feed rule is inert.
   **New ownership:** TIP owns it **as a service**. **ICBM and JUV co-run it.** Every other lead
   either co-owns it or owns an adjacent service that feeds its automation. No single agent is
   the automation.

3. **Every card is gated by accident.** `requiresApproval` **fails closed on an unassigned card**
   (`BOARD_DATA_CONTRACT.md` §6) and all 19 cards are unassigned. That is why 100% of work reads
   as needing me. **Assign every card at filing time**, from `TEAM_BRIEFING.md` §4. Not at pickup.

4. **You cannot edit a board.** Shipped CLI is `board ls | get | create | card add | card approve
   | card deny`. No `board set`, no `board retire`, no `card set`. The verbs exist in **PR #18**
   (`pheartkeys/hvgapp`, +1003 lines, opened 2026-08-16) with **failing Docker builds, no review,
   untouched five days.** The installed `Buzz.app` binary also predates commit `4e813855` — its
   seed set has no `hvgapp` board.

---

## 4. BRAND TRUTH AND BUILD ORDER — LOCKED

`TEAM_BRIEFING.md` §3 is canon. **MoSober and K&B Concrete are never referenced again.**

`hvgapp` · `gomarco` · `itshvg` · `lhfyc` · `clean` · `three`

**Order:**
> **`hvgapp` → `gomarco` → (`itshvg` ‖ `lhfyc` ‖ `clean`, in parallel) → `three`**

`gomarco` is second because **Selina is bank-rolling development across the portfolio.** Treat
its schedule as an external commitment.

**`gomarco` reference implementation:** Peter has a **full working Android prototype**. It is the
reference for the actual product — read it before writing a line of spec. Local material:
`~/Desktop/marco`, `~/antigravity/Marco`. `gomarco` is also the only brand with no flow in
`TEAM_BRIEFING.md` §4 — **ICBM + PMP author it before any gomarco card is filed.**

**Surfaces — locked. Sequence within a brand is yours:**

| Slug | Website | Web app | Mobile app | Desktop app |
|---|:--:|:--:|:--:|:--:|
| `hvgapp` | — | Buzz | ✅ | Buzz |
| `gomarco` | ✅ | ✅ | ✅ | ✅ |
| `itshvg` | ✅ | ✅ | — | — |
| `lhfyc` | ✅ | ✅ | ✅ | ✅ |
| `clean` | ✅ | ✅ | ✅ | ✅ |
| `three` | ✅ | ✅ | — | — |

Disagree once, in the convene thread, with a reason. Then build the table.

---

## 5. PHASES

Every phase opens with a **convene** in `#build`: named agents, one thread, **a written artifact
before anyone touches a keyboard.** Agreeing in chat and dispersing is not convening.

### PHASE 0 — Make the board writable and correct · `hvgapp`
Nothing else starts until this lands.

- **Convene:** MFR, TUN, TIP, VON, ICBM, JUV → one-page repair plan naming who does what.
- **MFR + TUN** spec, **YBY** implements: rescue PR #18. Green the Docker builds, land
  `board set`, `board retire`, `card set`, `card set --goal`.
- **VON** tests. **TIP** cuts a Buzz.app build so the installed binary matches source.
- **TUN executes the migration writes** — he holds `845798e3…`, the key that wrote every brand
  board and all 19 cards. A write from any other key forks the head instead of updating it.
  **JUV routes and verifies; JUV does not write.** The `unified-master` board is YBY's key
  (`f3c3ef93…`) — its column change is YBY's write, not TUN's.
  - TUN: create `hvgapp`, `gomarco`, `lhfyc`
  - TUN: `board set three --title "We 3 Live"`
  - TUN: retire `concrete` and `sober`
  - TUN: delete the 5 junk cards on `unified-master`
  - YBY: normalise `unified-master` to 5 columns
- **TIP + ICBM + JUV** stand up the feed-rule executor as a service. Comet is not coming back.
- **TIP** — NIP-05 identity for the whole team. Two halves, both required:
  1. Publish `https://hvg.app/.well-known/nostr.json` mapping each handle to its 64-char hex
     pubkey: `{"names": {"peter": "<hex>", "tun": "<hex>", ...}}`. Without this file a NIP-05
     identifier sits on the profile unverified.
  2. Each identity sets its own — the key must be the one being named:
     `buzz users set-profile --name '<HANDLE>' --nip05 '<handle>@hvg.app'`
     `set-profile` publishes a replaceable kind:0, so **pass every field you want kept in the
     same call** — run `buzz users get` first and carry the existing values forward.
  Verify with `buzz users get --name <handle>`. Peter's own is `peter@hvg.app`.
- **Done when:** exactly seven boards, correct titles, zero cards on a slug outside the locked
  six, zero occurrences of "MoSober" or "K&B Concrete", and a card can be filed, assigned, moved
  and re-tagged from the CLI. **VON verifies — not JUV, not the author.**

### PHASE 1 — Populate every board · all scopes
Every card it takes to **launch a brand**, not just build it. Granularity is **one capability,
not one page** (`BUILD_WORKFLOW.md` §7). If a card cannot ship alone, split it.

Each function lead writes their own cards. One agent writing all of them is how a board becomes
a build tracker with a marketing footnote. Nine tracks, per brand:

| Track | Owner |
|---|---|
| Strategy & positioning | ICBM, PMP |
| Brand & design | ROO |
| Accounts & infrastructure — domain, hosting, analytics, email, payments, app-store | TIP |
| Channels — social handles, YouTube, newsletter, community | LDA, BOO, NKI |
| Build, per surface | MFR, TUN, YBY, 3TH |
| Products — core offer, merch/POD, curated sourcing | IVY |
| Marketing & advertising | KDK, LDA, BOO |
| Ops & managing | JUV, NKI |
| Legal & compliance | MIA |

Build the template once against `hvgapp`, extract it, then instantiate. The second instance is a
*"verify the template holds"* card, not a rebuild. Writing the same card a third time by hand
means stop and extract.

Every card carries `--brand`, `--fn`, **an assignee**, and a `parentGoalId`.
**Done when:** every board fully carded, nothing unassigned, everything rolls up to a goal.

### PHASE 2 — `hvgapp` to done
JUV → MFR & TUN → ROO → YBY → SLM → BOO → JUV. Buzz + mobile (3TH). Finish Board: DnD, goal
rollup, the three nudge loops.
**Done when:** Peter runs the operation from the app without opening a terminal.

### PHASE 3 — `gomarco`
Android prototype read, flow authored, definition pass, then all four surfaces.
**Done when:** live, and Selina can see it.

### PHASE 4 — `itshvg` ‖ `lhfyc` ‖ `clean` — parallel
Three crews, no queueing. `lhfyc` builds escrow rails, moves no money until legal clears.
`clean` builds the capture pipeline, records no home until consent clears. Neither gate blocks
the rest of that brand.

### PHASE 5 — `three`
IP and chain-of-title papered before the first script, animatic, or merch drop.

---

## 6. EVERY PHASE RUNS THE FULL CYCLE

Strategize → plan → prep → build → test → review → publish. A phase is not done because you
finished your part.

- **VON tests before anything is called done.** Not the author.
- **MIA reviews anything touching user data, money, or a real person.**
- **Cite sources with dates.** No claim without a path, link, or reference.

---

## 7. REPORTING

- **JUV posts one consolidated status per day** to `#build`: what moved, what is blocked, what
  ships next. One message, not eighteen.
- Everyone else posts **on state change only.**
- **NKI pages Peter for anything on the §0 gated list, and for crises.**
- **Do not ask Peter for status.** The board is the status. Make the board true.

---

## 8. START

Reply once:

```
HANDLE:
PHASE 0 ROLE:      <what you do first, or "standing by for Phase 1">
FIRST CARD:        <card + brand slug>
BLOCKERS I SEE:    <anything in §2 or §3 you think is wrong, with evidence>
ASSUMPTION I MADE: <any question you answered yourself>
```

Then **MFR opens the Phase 0 convene thread in `#build`.**

Do not reply to Peter again until Phase 0 is verified done, or something on the §0 list needs
his signature.
