# KICKOFF PROMPTS — paste these, in this order

Three posts. A goes to `#general`. B goes to `#build`. C goes to each squad channel.

---

## A — `#general` — ALL 18

```
STAND UP. New structure, new rules, work starts today.

Read these three, in order, before you reply:
  docs/STANDING_WORK_ORDER.md   — the rules, the goal, the phases
  docs/SQUADS.md                — your squad, your lead, your service
  docs/WORKFLOW.md              — the eight stages and the huddle map

THE RULE THAT CHANGED: you no longer stop and wait for Peter. Your "Needs Peter's
approval" column is void. Seven ACTIONS are gated (STANDING_WORK_ORDER §0) — money,
live DNS, first publish per channel, real-user contact, lhfyc escrow, clean in-home
consent, three IP. Everything else you just do. If you are about to ask Peter something
not on that list, answer it yourself and record the assumption on the card.

BLOCKED IS NOT A RESTING STATE. Escalate per routing within 30 minutes, then pick up
the next card. Same error twice, hand back with what you tried.

WORK STARTS NOW, IN PARALLEL. Two tracks:

  PHASE 0 — board repair. MFR TUN YBY VON TIP PAT JUV ICBM ROO SLM MIA.
            See post B in #build.

  PHASE 1a — card drafting. EVERYONE, including the Phase 0 crew when unblocked.
            See post C in your squad channel.

Reply once, in one message, in your squad channel:

HANDLE:
SQUAD / LEAD:
MY TRACK IN PHASE 1a:
FIRST THING I AM DOING:
BLOCKERS I SEE:      <anything in the docs you think is wrong, with evidence>
ASSUMPTION I MADE:   <any question you answered yourself instead of asking Peter>

Do not reply to Peter again until Phase 0 is verified done, or something on the §0
gated list needs his signature. JUV posts one consolidated status per day. Nobody else
posts status.
```

---

## B — `#build` — PHASE 0 CREW

```
PHASE 0 — MAKE THE BOARD WRITABLE AND CORRECT. Scope: hvgapp.

MFR opens the convene thread now. Attendees: MFR TUN TIP VON PAT ICBM JUV.
Output before anyone writes code: a one-page repair plan naming who does what.
Named scribe before it starts — huddles are NOT recorded (WORKFLOW.md §1, rule H1).

VERIFIED RELAY STATE 2026-08-21 — do not re-derive:
  concrete  "K&B Concrete"        0 cards   retire
  sober     "MoSober"             0 cards   retire
  three     "We3Live"             0 cards   rename -> "We 3 Live"
  clean     "Clean Startup"      11 cards   keep
  itshvg    "High Value Growth"   8 cards   keep
  unified-master                  5 cards   DELETE ALL 5 — every brand value is
                                            outside the locked set (mosober,
                                            clean-startup, we3live, hvg, kb-concrete)
  hvgapp / gomarco / lhfyc        missing   create

KEYS — boards reconcile by id. Writing from the wrong key FORKS the head.
  845798e3... = TUN  -> owns all 5 brand boards + all 19 cards
  f3c3ef93... = YBY  -> owns the unified-master board
  3b0c5670... = deleted agent -> wrote the 5 junk cards, non-blocking

  TUN executes every brand-board write. YBY executes the unified-master column
  normalisation. JUV routes and verifies. JUV DOES NOT WRITE.

THE WORK:
  1. PAT   — re-verify the state above against the relay. Report exact ids, no summaries.
  2. MFR+TUN spec, YBY implements — rescue PR #18 (pheartkeys/hvgapp, +1003 lines,
             opened 2026-08-16, Docker builds RED, no review, 5 days stale).
             Land: board set, board retire, card set, card set --goal.
  3. VON   — test it. TIP — cut a Buzz.app build; the installed binary predates
             commit 4e813855 and its seed set has no hvgapp board.
  4. TUN   — create hvgapp, gomarco, lhfyc. Rename three. Retire concrete + sober.
             Delete the 5 junk cards.
     YBY   — normalise unified-master from 4 columns to 5 (it is missing "Spec'd").
  5. MFR+TUN — ALSO spec `buzz huddle`. There is no CLI support for huddles; headless
             agents cannot convene or join one. Same trap the board had. Spec it while
             the CLI is already open (WORKFLOW.md §7 gap 1).
  6. TIP+ICBM+JUV — stand up the feed-rule executor as a SERVICE with three owners.
             Comet was the single designated executor and has been unreachable since
             2026-08-11. That failure mode does not repeat.

DOC CORRECTIONS — apply them:
  - `buzz board get` takes a POSITIONAL id: `buzz board get clean`, not `--id clean`.
    BOARD_REPAIR_ORDER.md §3 documents it wrong.
  - Relay is https://hvg.app. CLI default is localhost:3000. Always set BUZZ_RELAY_URL.
  - Every plan in .buzz/PLANS/ is owned by Fizz, Prop, Bloom, Comb, or Comet — none of
    whom exist on this roster. Remap every owner to a live handle as you touch them.

DONE WHEN: exactly seven boards, correct titles, zero cards on a slug outside the locked
six, zero occurrences of "MoSober" or "K&B Concrete" anywhere, and a card can be filed,
assigned, moved and re-tagged from the CLI.
VON VERIFIES. Not JUV, not the author.
```

---

## C — EACH SQUAD CHANNEL — PHASE 1a

```
PHASE 1a — DRAFT YOUR CARD SETS. Starts now, runs parallel to Phase 0.

WHY DRAFT AND NOT FILE: `card add` works today, but there is no `card set` — a card
filed now cannot be edited, ever, until PR #18 lands. So we draft now and file the
moment the verb exists. Phase 1b is the filing pass.

WRITE TO: .buzz/PLANS/CARDS_<SQUAD>_<BRAND>.md — one file per squad per brand.

COVER YOUR TRACK, FOR EVERY BRAND:
  Command        ICBM PMP    strategy, positioning, audience, offer, pricing
  Build          MFR TUN YBY 3TH   website, web app, mobile app, desktop app
  Research&Data  PAT SLM     benchmarks, verification, data models
  Creative       ROO KDK LDA brand kit, tokens, voice, copy, video
  Growth         PMP IVY BOO accounts, channels, products, merch, SEO/GEO, schema
  Trust&Safety   MIA NKI     privacy, terms, disclosure, licensing, support, moderation
  Ship           TIP VON     domain, hosting, analytics, payments, app-store, test plan

BRANDS AND SURFACES (STANDING_WORK_ORDER §4 — locked):
  hvgapp   Buzz + mobile. NO website, ever.
  gomarco  website, web app, mobile, desktop
  itshvg   website, web app
  lhfyc    website, web app, mobile, desktop
  clean    website, web app, mobile, desktop
  three    website, web app

RULES:
  - One capability per card, NOT one page. If it cannot ship on its own, split it.
  - Every card needs: title, description, --fn, and a NAMED ASSIGNEE. Unassigned cards
    fail closed on the approval gate — that is why nothing moved for ten days.
  - Write the template ONCE against hvgapp, then instantiate. The second instance is a
    "verify the template holds" card, not a rebuild. Same card by hand a third time
    means stop and extract it.
  - Carry open questions IN the description so they surface at pickup, not in a thread.
  - Cite sources with dates.

MINE FIRST, DO NOT START BLANK:
  .buzz/PLANS/BOARD_SEED_CARDS.md          19 written cards for clean + itshvg
  .buzz/PLANS/BOARD_SEED_PRIORITY_BRANDS.md the archetype thesis
  .buzz/PLANS/BUILD_WORKFLOW.md §7          card granularity rule
  .buzz/RESEARCH/BRAND_DEFINITIONS.md       brand truth (MoSober/K&B sections are dead)

TWO SPECIAL CASES:
  gomarco — ICBM + PMP author the flow and product definition FIRST. It is the only
            brand with no flow in TEAM_BRIEFING §4, it is priority #2, and Selina is
            funding it. Peter has a full working Android prototype — that is the
            reference for the real product. Read it before writing a line.
            Local: ~/Desktop/marco, ~/antigravity/Marco
  three   — no script, no animatic, no merch card gets filed before IP and
            chain-of-title are papered. MIA owns that gate.

DONE WHEN: every squad has a drafted card set for every brand, every card has a named
assignee, and the files are committed. Then Phase 1b files them.
```
