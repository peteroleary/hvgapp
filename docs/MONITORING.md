# MONITORING — THE 15-MINUTE WATCHER

**Decision needed from Peter: none. Build order below is the recommendation.**

## The answer to "smallest local model"

**Qwen3-4B (Q4_K_M, ~2.5 GB) via Ollama** — the smallest model that holds structured
judgment reliably (classify OK/anomaly, emit clean JSON). Below 4B (Llama 3.2 3B, Qwen3
1.7B) classification gets flaky and you spend more tokens re-asking than you save.
Ollama itself is a ~250 MB install. Total footprint under 3 GB — nothing like the 28 GB
LM Studio install we just removed.

**But the model is the smallest part of this design.** 90% of monitoring is deterministic
— a script, not an LLM. The model only writes the anomaly summary. And in v1 even that is
optional: JUV is already an LLM with judgment; burning a local model to pre-digest for him
only pays when telemetry volume gets big. Build script-first.

## Architecture

```
launchd (every 15 min)
  └─ monitor.sh  — pure checks, zero LLM, zero subscription tokens
       ├─ per agent: buzz-acp process alive? log mtime fresh? error greps
       │   (ENXIO pattern, "session limit · resets HH:MM" rate-limit lines, requeue loops)
       ├─ relay: https://hvg.app health + one WS REQ round-trip
       ├─ boards: any card moved/filed since last check (board ls updatedAt diff)
       ├─ disk: df free GiB (today's 1 GiB near-death — never again)
       ├─ RAM: memory_pressure level
       └─ subscription pressure: which runtime hit a rate limit + reset time (from logs)
  └─ verdict
       ├─ healthy → append one line to a rolling log, post NOTHING (quiet when healthy)
       └─ anomaly → Qwen3-4B (Ollama, local, free) condenses to a 5-line dispatch note
            → posted to #command with @JUV mention
```

JUV's P9 loop changes one line: between the 4h cron pings, act on monitor posts in
real time — idle slot, dead agent, or a hot subscription reroutes immediately.

## Token usage telemetry — the honest gap

Verified 2026-08-22: **buzz-acp logs emit no per-turn token counts today.** Two sources,
in order:
1. **v1 (free, now):** rate-limit events in harness logs tell you which subscription is
   capped and when it resets (ROO hit claude's at 18:15 yesterday). That is the BUDGET
   signal JUV needs for routing, even without absolute numbers.
2. **v2 (P10 dependency):** the headroom proxy sees 100% of LLM traffic — per-agent,
   per-model token totals. PAT owns the report shape. Until P10 lands, any "usage %" is
   invented. Don't invent it.

## P12 — GIVE TO TIP (#build), no dependencies

```
Build the 15-minute watcher per docs/MONITORING.md.

1. ~/.buzz/monitor/monitor.sh — the checks in §Architecture. Pure bash + buzz CLI.
   State file for diffs (last board updatedAt, last log mtimes). Exit 0 quiet, exit 1
   with a condensed anomaly payload on stdout.
2. launchd plist: StartInterval 900, run monitor.sh. On exit 1, post the payload to
   #command mentioning @JUV (buzz messages send --channel fdf5cf79-... --mention <JUV hex>).
3. Install Ollama, pull qwen3:4b. The summarizer call sits between the payload and the
   post — max 5 lines, no fluff, always ends with the named owner of the fix.
4. Add the disk check first and test it by hand — 1 GiB free nearly killed us today.

DONE WHEN: an anomaly you stage (kill one agent's process) produces a JUV-mention post in
#command within 15 minutes, and a quiet 15 minutes produces nothing.
```
