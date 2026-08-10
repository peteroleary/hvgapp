# Board — Design

Status: validated design, ready for implementation planning.
Owner: Peter. Design partner: Claude (Cowork). Build team: Bloom (design/UI, first) -> Fizz + Prop (architecture/high-level implementation) -> Comb (routine implementation) -> Fizz + Prop (review).

## Purpose

Board is the operational Kanban for the entire six-brand operation (and any brand added later) -- build, design, content, social, marketing, sales, research, everything. It is not scoped to code; the existing git-issue/PR "Projects" feature in Buzz remains the code-specific surface and a Board card can optionally link out to a git issue when the work is code.

## References

- `github.com/peteroleary/kaybee` -- closest analog. Not a generic Kanban: cards carry a status lifecycle (idle/eligible/running/completed/blocked/needs_approval), an assigned agent, and sit behind a goal -> plan -> steps -> human approval -> execution contract. Directly informed the card/goal model below.
- `github.com/peteroleary/hvglab` -- less relevant to Board specifically. It's a 3D spatial "virtual office" product (org graph rendered as a navigable space) -- closer to the charter's proposed "Hive" surface than to Board. Noted so the two references don't get blended.
- Buzz's existing `desktop/src/features/projects/` -- a git-issue/PR tracker (NIP-34-style Nostr git events: KIND_GIT_ISSUE, KIND_GIT_PULL_REQUEST, statuses open/closed/merged/draft). Separate, code-specific, pre-existing. Board links to it, does not replace it.

## Data model

### Card

```
{
  id: string,
  title: string,
  description: string,
  brand: string,               // HVG | MoSober | Clean Startup | We3Live | K&B | hvg.app | future brands
  function: string,             // build | design | content | social | marketing | sales | research | other
  assignees: [{ type: 'agent' | 'human', id: string, role?: string }],
  status: string,                // free-form label tied to listId, not the approval gate
  requiresApproval: boolean,     // computed from the autonomy-trust table (see below); enforced independent of list position
  position: number,
  listId: string,
  boardId: string,
  linkedGitIssue?: string,       // optional pointer into the existing Projects feature
  createdBy: string,
  feedForwardContext?: Record<string, any>,  // carries what an agent learned partway through, for clean handoffs
  comments: [{ authorId: string, body: string, createdAt: string }],
}
```

### Goal

```
{
  id: string,
  brandScope: string,
  framework: 'SMART' | 'OKR' | 'PACT',
  smart?: { specific, measurable, attainable, reachable, timeBound },
  okr?: { objective: string, keyResults: [{ description, targetMetric, currentValue?, targetValue? }] },
  pact?: { purposeful, actionable, continuous, trackable },
  status: 'draft' | 'proposed' | 'approved' | 'executing' | 'completed',
  proposedCards: [{ cardDraft: Partial<Card>, suggestedAssignee: string }],
}
```

A goal cannot leave `draft` until its framework-specific fields are filled in. Comet is the default agent that takes a rough goal from Peter, shapes it into one of the three frameworks, and proposes the card batch -- a human or another agent can still hand-build a card directly without going through a goal.

## Approval / autonomy model

`requiresApproval` is computed from a trust table, not hardcoded:

```
{ agentId: string, function: string, autonomyLevel: 'manual' | 'notify' | 'auto' }
```

Everyone defaults to `manual` at launch. Peter raises individual entries as trust builds (e.g. Comb on routine implementation cards likely earns `auto` long before Scout does on anything involving a signature). Comet manages this table on request; agents do not grant themselves autonomy.

List membership (which column a card sits in) is fully custom per board and decoupled from the approval gate -- renaming or reordering lists never bypasses `requiresApproval`.

## Multiple boards and feed rules

Boards are first-class, creatable entities. Default is one unified board as the source of truth; additional boards (per-brand, a content-pipeline board, an ideas backlog) can be created as needed.

Feed rule: `{ sourceBoardId, sourceListId, targetBoardId, targetListId, action: 'move' | 'copy' | 'spawn-linked-card' }`. Fires when a card enters the source list. `spawn-linked-card` creates a linked child card on the target board rather than moving/duplicating outright, so status can optionally propagate without the two records silently diverging. Exact trigger granularity beyond list-entry (status change, assignee change) is Fizz/Prop's call.

## UI placement

Board is a new top-level surface in Buzz Desktop, alongside Agents and Channels -- not nested inside a brand or channel, since cross-brand visibility is the point. A channel can filter to its own cards without Board living inside it.

## Comet

New agent, Gemini 3.5 Flash-Lite (cheapest usable Gemini tier -- local models are currently blocked through Goose, a known unresolved upstream bug, so not a live option today). Comet operates Board itself: shapes goals into SMART/OKR/PACT, decomposes them into cards, assigns best-fit agent or human, configures boards/lists/feed rules on request. Comet does not do the work on any card and does not grant autonomy-table changes without Peter's ask. Already configured in Buzz as of this design.

## Error handling

- Feed rule fires but the target board/list has been deleted: card stays on its source board, the rule is flagged broken rather than silently dropping the card.
- Assigned agent removed from the team: its cards surface as unassigned for Comet to re-route, rather than vanishing.
- Concurrent edits to the same card: follow whatever conflict-resolution pattern the rest of Buzz already uses for relay-synced state -- Fizz/Prop's call on the exact mechanism.
- Card stale at "needs approval" past a threshold: surfaces a nudge to Peter rather than waiting silently. Exact threshold TBD.

## Testing

- Card and goal state transitions get unit tests as elsewhere in the codebase.
- The approval gate specifically needs a test proving a card cannot be actioned while `requiresApproval` is true, mirroring how existing readiness gates are tested elsewhere in Buzz.
- Feed rules tested for all three actions (move/copy/spawn-linked-card) plus the broken-target case.

## Build sequence

1. **Bloom** designs the boards, lists, cards (including the expanded modal view), and UI components/elements first. Nothing below starts until Bloom's specs exist.
2. **Fizz** (planning/architecture, working with Prop) and **Prop** (high-level implementation: scaffolding, architecture-level coding, specs for Comb) build from Bloom's specs.
3. **Comb** implements the routine, well-specified pieces Prop hands off.
4. **Fizz and Prop** both review before anything merges.
