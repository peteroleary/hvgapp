# WORK ORDER — REPAIR THE BOARDS AND CARDS

**Routed to:** JUV (owner) · MFR + TUN (build) · YBY (implementation) · PAT (verification)
**Scope:** `hvg-app` · **Approval gate:** Peter, before anything destructive

You built these boards. They are now wrong, and you are correcting them.

---

## 1. THE CORRECT END STATE

Exactly seven boards, no others:

| Board id (`d` tag) | Title | Brand slug |
|---|---|---|
| `unified-master` | Unified Master | *(none — cross-brand)* |
| `hvg-app` | hvg.app | `hvg-app` |
| `itshvg` | High Value Growth | `itshvg` |
| `gomarco` | Go Marco | `gomarco` |
| `lhfyc` | Look How Far You've Come | `lhfyc` |
| `clean` | Clean Startup | `clean` |
| `three` | We 3 Live | `three` |

Every card carries a `brand` from that slug set and a `t` tag `brand:<slug>`.

---

## 2. WHAT IS WRONG

The brand registry was rekeyed. `sober` was retired in favour of `lhfyc`,
`concrete` was removed from the portfolio, and `gomarco` was added. The board
data was never migrated, so the relay is expected to still hold:

- a `sober` board titled **MoSober** — retired name, must not appear anywhere
- a `concrete` board titled **K&B Concrete** — brand removed from the portfolio
- a `three` board titled **We3Live** — should be **We 3 Live**
- **no** `lhfyc`, `gomarco`, or `hvg-app` board
- cards tagged `brand:sober` / `brand:concrete` — slugs the registry no longer knows

**Do not assume this list is accurate. Verify it first.** It is derived from the
code, not from the relay.

---

## 3. WHAT YOU CAN AND CANNOT DO TODAY

Know the boundary before you start, or you will burn a cycle discovering it.

**Available now:**
- `buzz board ls` — list reconciled board heads
- `buzz board get --id <id>` — one board, cards grouped by column
- `buzz board create --id <id> --title <t> --brand <slug>` — **refuses if the id exists**
- `buzz board card add --board <id> --title <t> --brand <slug> --fn <area>`
- `buzz board seed` — idempotent; **skips** boards and cards that already exist

**Not available — there is no verb for these:**
- renaming an existing board's title
- deleting or retiring a board
- moving, re-tagging, or deleting an existing card

Board ids are the `d` tag and are immutable. `sober` can never *become* `lhfyc`.
The retired boards have to be retired as records, and their cards re-filed.

---

## 4. THE WORK

**Task 1 — PAT: diagnose (do this first, report before anyone writes).**
Run `buzz board ls` and `buzz board get` on every board. Report, as a table:
every board id, title, brand scope, card count, and every distinct `brand` value
found on cards. Flag any card whose brand is not in the locked slug set. Cite
exact ids — no summaries.

**Task 2 — JUV: create what is missing.**
Once PAT reports, create only the boards that genuinely do not exist:
`buzz board create --id lhfyc --title "Look How Far You've Come" --brand lhfyc`
`buzz board create --id gomarco --title 'Go Marco' --brand gomarco`
`buzz board create --id hvg-app --title 'hvg.app' --brand hvg-app`
If `board create` refuses, the board already exists — say so, do not force it.

**Task 3 — MFR + TUN: design and build the missing verbs.**
The repair cannot finish without them. Spec and implement, in `buzz-cli`:
- `board set --id <id> [--title] [--description] [--brand]` — republish the
  30623 head for an existing id. This is the one that fixes titles.
- `board retire --id <id>` — mark a board retired without destroying history.
  Decide the mechanism and write down why.
- `board card set --id <card> [--brand] [--board] [--list]` — re-tag and re-file
  a card so cards can be moved off retired brands.
Read-before-write against the reconciled head, same as the existing verbs.
Brand values validate against `BRAND_SLUGS` at the write boundary.
YBY implements from the spec; do not start before the spec is agreed.

**Task 4 — JUV: migrate, once the verbs exist.**
Fix the `three` title. Move every card off `sober` and `concrete` onto its correct
brand. Retire the two dead boards. **Every card must land somewhere — nothing is
deleted.** If a card has no obvious home, park it on `unified-master` and list it
for Peter.

**Task 5 — PAT: verify.**
Re-run the Task 1 diagnosis. Definition of done: exactly the seven boards in §1,
correct titles, zero cards on a slug outside the locked set, zero occurrences of
`MoSober` or `K&B Concrete` anywhere in board or card content.

---

## 5. CONSTRAINTS

1. **Nothing destructive without Peter.** Retiring a board and moving cards is
   destructive. Task 4 stops at the approval gate.
2. **No card is deleted.** Ever. Park it on `unified-master` instead.
3. **Read before write.** Build from the reconciled head, never local state.
4. **Slugs, not display names.** `lhfyc`, not "Look How Far You've Come".
5. **Report exact ids.** "Some cards were wrong" is not a report.

---

## 6. DECIDED — PLATFORM BOARD

Peter has ruled: the portfolio keeps **both** `unified-master` and a separate
`hvg-app` board. Platform work — relay, desktop, agent harness, board, pipelines
— goes on `hvg-app`. `unified-master` stays for cross-brand coordination and for
parking cards that have no clear home.

`hvg-app` is already in the seed set, so `buzz board seed` will create it.
