# SELINA DIGEST — MARCO-ONLY SCHEDULED WORKFLOW

**Decision (Peter, 2026-08-22):** Selina gets no Buzz access for now. Instead a scheduled
Buzz workflow fires on a fixed cadence and prompts the Growth squad to compile a
**Go Marco only** update. Peter forwards it to her himself.

**Why this shape:** multi-tenancy is draft, not shipped; the relay process is the only
real security boundary (HANDOFF_KIMI §8). A workflow needs no new access for anyone.

**Verified engine facts** (`crates/buzz-workflow/src/schema.rs`, 2026-08-22):

| Fact | Detail |
|---|---|
| Trigger | `on: schedule` with `cron` (5/6/7-field, **UTC**) or `interval` (min 60s) |
| Scheduler | Relay-side cron loop, ticks every 60s — no client needs to be online |
| Action used | `send_message` posts into the workflow's channel |
| Also available | `call_webhook` — the future upgrade path (email/ webhook to Selina without Buzz access) |
| CLI | `buzz workflows create --channel <UUID> --yaml '<yaml>'` |

## The workflow (live on the relay)

Channel: `#growth` (`1b6c6516-3bf9-4831-80b8-71bb6fef8355`).
**Workflow id: `066668ce-0b59-49a7-a3ab-3989d43250c4`** — created 2026-08-22, verified
via `buzz workflows list`. Owner key: the current desktop identity (`3b0c5670…`).

```yaml
name: Marco Digest for Selina
description: Weekday prompt for Growth to compile a Go-Marco-only update for Selina (funder). Peter forwards it.
enabled: true
trigger:
  on: schedule
  cron: '0 13 * * 1-5'
steps:
  - id: prompt
    action: send_message
    text: "MARCO DIGEST for Selina (Go Marco funder). Last 24h, GO MARCO ONLY: cards moved, decisions, blockers, next milestone. 5 lines max, plain English, no agent jargon. Post it in this channel; Peter forwards it."
```

- Cadence: **09:00 ET (13:00 UTC), Monday–Friday.** Switch to weekly by changing the cron
  to `0 13 * * 1` and re-running `buzz workflows update`.
- Digest rules: Marco only, 5 lines, plain English. Other brands never appear — that is
  the entire access-control story while tenancy is unshipped.

## Upgrade path (when Selina wants direct delivery)

Swap/append a `call_webhook` step pointing at an email or SMS relay — no Buzz account
required on her end. Not built; note it when she asks.
