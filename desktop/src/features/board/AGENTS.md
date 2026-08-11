# Board feature DOX

## Purpose

`board/` owns the cross-brand operational Kanban surface and its Nostr-backed
read/write model. It is separate from Projects, which remains the code-specific
git issue and pull-request surface.

## Ownership

- `types/` owns the compiled Board domain contract.
- `state/` owns Nostr event codecs, snapshot reconciliation, relay mutations,
  and React Query hooks.
- `ui/` owns Board presentation only; it receives typed state and callbacks
  from `state/` rather than issuing relay calls itself.

## Local Contracts

- Persistence is the Board contract in `PLANS/BOARD_DATA_CONTRACT.md`:
  addressable kinds 30623–30627 and approval kinds 50001–50003.
- `requiresApproval` is derived through `evaluateAutonomy`; do not persist it.
- Card rank and list rank are fractional strings sorted lexicographically.
- Card mutations must preserve the Board address and all indexed contract tags.
- Keep Nostr event parsing defensive: relay content and tags are untrusted.

## Work Guidance

- Build Nostr codecs as pure functions and test them at that public seam.
- Use React Query and the shared relay client for UI state; do not add a second
  global state library.
- Keep UI components free of relay query and publishing details.

## Verification

- `cd desktop && pnpm test`
- `cd desktop && pnpm typecheck`
- `cd desktop && pnpm check`

## Child DOX Index

- [types/](types/): Compiled Board domain types and approval evaluation.
- [state/](state/): Event codecs, relay adapters, and query hooks.
