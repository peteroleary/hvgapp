# MONITORING — THE 15-MINUTE WATCHER

**Decision needed from Peter: none. Build order below is the recommendation.**

## The answer to "smallest local model" — superseded 2026-08-22

**Use the cloud small models, not a local one.** The watcher only calls a model on
anomalies — a few ~2K-token calls a day, worst case 96 (every 15 min). That is cents per
month; a local model is 3 GB on disk forever and *worse* at structured judgment.

| Option | Verdict |
|---|---|
| **Gemini flash-class** (NKI already runs gemini-3.7-flash — access proven) | **Recommended.** Cheapest, fastest, zero disk. Via goose's configured Google provider or a direct API key if one exists. |
| **GPT nano/mini-class** (via codex) | Equal fallback. Same cost ballpark. |
| goose as the runtime | Only if no raw API key exists — goose is a harness, not a model; one-shot classify doesn't need it if curl can hit the API. |
| Local Qwen3-4B via Ollama (~3 GB) | Only if offline operation or zero-cloud-dependency becomes a requirement. Not today. |

**And the v1 truth:** most anomalies are templated (dead agent, low disk, relay down) —
the script can post those with NO model at all. The model only interprets ambiguous
cases. Build v1 model-free; wire the flash summarizer when a vague anomaly actually shows up.

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
       └─ anomaly → templated alert posts directly (dead agent / low disk / relay down
            need no model); ambiguous cases go through gemini flash-class (cents/month)
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
3. NO local model, NO Ollama. Templated alerts post directly. For ambiguous anomalies,
   summarize via gemini flash-class (goose's Google provider, or a direct API key if one
   exists) — max 5 lines, no fluff, always ends with the named owner of the fix.
4. Add the disk check first and test it by hand — 1 GiB free nearly killed us today.

DONE WHEN: an anomaly you stage (kill one agent's process) produces a JUV-mention post in
#command within 15 minutes, and a quiet 15 minutes produces nothing.
```
