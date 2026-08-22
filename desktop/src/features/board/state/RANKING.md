# Board ranking and drop resolution

The pure layer drag-and-drop sits on. Every function here is synchronous,
side-effect free, and unit-tested against `node --test` — no React, no relay,
no dnd-kit event objects. UI wiring imports these; they import nothing back.

## Why fractional ranks

A card's position in a column is a lowercase `a`-`z` string compared
lexicographically. Dropping a card between two neighbours mints a rank strictly
between theirs, so **exactly one event is republished per drag**. Renumbering
the column instead would republish every card in it — over a relay that is the
difference between a drag being free and a drag being a write storm.

Read a rank as the fraction it spells in base 26: `"n"` is the middle of the
alphabet, `"hn"` sits between `"h"` and `"i"`. Strings grow only when a gap runs
out of whole digits, so ordinary use keeps them one or two characters.

**A rank never ends in `a`.** `a` is the lowest digit, so a trailing `a` leaves
no room to insert below it without lengthening the *neighbour* — the one thing
fractional ranking exists to avoid. `isValidRank` rejects it and
`buildBoardEventTemplate` refuses to publish a list carrying one.

Ordering tiebreaks on `(rank, createdAt, id)` — see data-contract §4.

## The three modules

| Module | Answers |
|---|---|
| `rank.ts` | "What rank sits between these two?" — `rankBetween`, `compareRank`, `isValidRank`, `RANK_FIRST` |
| `dropRank.ts` | "Where did this **card** land?" — `resolveDropRank` returns the new rank, or `null` for a no-op |
| `listReorder.ts` | "Where did this **column** land?" — `reorderLists` returns the whole list array with one rank changed, or `null` |

`resolveDropRank` returning `null` is load-bearing: it is how the UI knows not
to publish. Dropping a card on itself, or onto the container when it is already
last, changes nothing and must not emit an event.

Its `overId` is overloaded by design, because that is what dnd-kit hands you:
it is either **an item's id** (insert relative to it) or **the column
container's id** (append at the end). `resolveDropRank` distinguishes them by
lookup, so callers pass `over.id` through untouched.

Insertion direction matches dnd-kit sortable semantics exactly:

- dragging **down** within a column lands *after* the over item
- dragging **up** within a column lands *before* it
- **cross-column** drops always land *before* the over item
- dropping on the **container** appends

## Conventions that bite

- `.ts` sources import extensionless (`from "./rank"`). The `.mjs` test files
  import with the extension (`from "./rank.ts"`) because they run under
  `--experimental-strip-types`. Both forms are correct in their own file type;
  mixing them is what breaks.
- `reorderLists` takes `readonly T[]`. dnd-kit's `arrayMove` takes `T[]`, so the
  call site copies. Do not widen the parameter to satisfy the library.

## Adding UI on top

Wire dnd-kit in the components, not here. `SidebarDnd.tsx` is the working
in-repo pattern. Hand `resolveDropRank` the destination column, `active.id`,
and `over.id`; if it returns a rank, publish through `boardMutations` — which
republishes the one card and invalidates the shared read model. If it returns
`null`, do nothing.
