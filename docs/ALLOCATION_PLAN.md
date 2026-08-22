# ALLOCATION Implementation Plan

> **For the team:** JUV dispatches this plan task-by-task under the P0 rules
> (EXECUTION_PROMPTS.md): evidence or it isn't done, max `~/.buzz/max-agents` live cards,
> work that isn't pushed doesn't exist. Each task names its owner and its channel.

**Goal:** Make model-to-task allocation measured, paced, and idle-free per `docs/ALLOCATION.md`.

**Architecture:** Rules + watcher + JUV now (docs and a bash/launchd watcher); headroom
telemetry and the B2 executor automate the same rules later. No redesign when they land.

**Tech Stack:** bash + buzz CLI + launchd (watcher); Tauri/React (Desktop toggle);
relay notes/logs/boards (telemetry sources).

## Global Constraints

- Floors are minimums: failover never goes below a card's `[floor:T?]` (ALLOCATION §2).
- `~/.buzz/max-agents` (contents: `1`, `2`, or `3`) is the only concurrency source of truth.
- §0 gated actions never run unattended (STANDING_WORK_ORDER).
- No invented usage numbers: PAT measures, everyone else waits (ALLOCATION §0.4).
- Commits use `git commit -s` (DCO). Docs commits go to `main` on `pheartkeys/hvgapp`;
  agent artifacts go to the `~/.buzz` repo.
- Replies and posts are terse (SWO §7).

Already done outside this plan (2026-08-22): grok PTY shim live (P11); ORCHESTRATION P9
and EXECUTION_PROMPTS P8 updated for SLOT 3 + `[floor:T?]` tagging at filing.

---

### Task 1: Watcher core — `monitor.sh` (TIP, #build)

**Files:**
- Create: `/Users/po/.buzz/monitor/monitor.sh`
- Create: `/Users/po/.buzz/monitor/state` (key=value store, created by the script)

**Interfaces:**
- Produces: exit 0 = healthy (silent), exit 1 = anomaly payload on stdout (consumed by Task 2's launcher).
- Produces: state keys `last_board_update`, `last_check_epoch`, `ratelimit_<runtime>=<reset_epoch>` (Task 9 reads these).

- [ ] **Step 1: Write the script with the six checks**

```bash
#!/bin/bash
# ~/.buzz/monitor/monitor.sh — 15-minute hive health check. Silent when healthy.
set -u
LOGS="/Users/po/Library/Application Support/xyz.block.buzz.app/agents/logs"
STATE="/Users/po/.buzz/monitor/state"
mkdir -p "$(dirname "$STATE")"; touch "$STATE"; . "$STATE" 2>/dev/null
PROBLEMS=()

# 1. DISK (first — 1 GiB free nearly killed the hive 2026-08-22)
FREE_GIB=$(df -g / | tail -1 | awk '{print $4}')
[ "$FREE_GIB" -lt 10 ] && PROBLEMS+=("DISK: ${FREE_GIB} GiB free (<10). Owner: TIP.")

# 2. AGENTS: every buzz-acp agent's log must have no fresh ENXIO and a live process
pgrep -f buzz-acp >/dev/null || PROBLEMS+=("HARNESS: zero buzz-acp processes. Owner: Peter (relaunch Buzz.app).")
for L in "$LOGS"/*.log; do
  tail -50 "$L" | grep -q "Device not configured" && \
    PROBLEMS+=("AGENT: $(basename "$L" | cut -c1-8) ENXIO loop. Owner: TIP.")
done

# 3. RELAY
curl -sf -m 10 https://hvg.app/health >/dev/null || \
  PROBLEMS+=("RELAY: hvg.app health check failed. Owner: MFR.")

# 4. RATE LIMITS: fresh 'session limit' lines -> pressure map
for L in "$LOGS"/*.log; do
  R=$(tail -100 "$L" | grep -o "session limit · resets [^ ]* [^)]*" | tail -1)
  [ -n "$R" ] && PROBLEMS+=("RATELIMIT: $(basename "$L" | cut -c1-8) hit $R. Owner: JUV reroutes per ALLOCATION §3.")
done

# 5. BOARDS: movement since last check (informational, feeds Task 9)
CUR=$(BUZZ_PRIVATE_KEY=$(security find-generic-password -s buzz-desktop -a secrets -w | python3 -c 'import sys,json;print(json.load(sys.stdin)["identity"])') \
  BUZZ_RELAY_URL=https://hvg.app buzz board ls 2>/dev/null | python3 -c 'import sys,json;print(max(b["updatedAt"] for b in json.load(sys.stdin)))' 2>/dev/null || echo 0)
echo "last_board_update=$CUR" > "$STATE.new"
echo "last_check_epoch=$(date +%s)" >> "$STATE.new"
mv "$STATE.new" "$STATE"

# 6. RAM
memory_pressure 2>/dev/null | grep -q "System-wide memory free percentage:.*[0-9]%" && \
  FREE_PCT=$(memory_pressure | grep -o '[0-9]*%' | tail -1 | tr -d '%') && \
  [ "${FREE_PCT:-100}" -lt 10 ] && PROBLEMS+=("RAM: ${FREE_PCT}% free. Owner: Peter (drop max-agents to 1).")

if [ ${#PROBLEMS[@]} -eq 0 ]; then exit 0; fi
printf '%s\n' "${PROBLEMS[@]}"
exit 1
```

- [ ] **Step 2: Test each check by hand**

Run: `bash ~/.buzz/monitor/monitor.sh; echo "exit=$?"`
Expected: exit 0 with zero output when healthy. Then stage a failure:
`sudo sysctl` nothing — instead temporarily lower the disk threshold to 1000 (GiB) and
re-run; expect exit 1 with a DISK line. Restore the threshold to 10.

- [ ] **Step 3: Commit**

```bash
cd /Users/po/.buzz && git add monitor/monitor.sh && git commit -s -m "monitor: 15-min hive health checks" && git push
```

### Task 2: Watcher launcher + Buzz.app keepalive (TUN, #build)

**Files:**
- Create: `/Users/po/Library/LaunchAgents/app.hvg.monitor.plist`
- Create: `/Users/po/Library/LaunchAgents/app.hvg.buzz-keepalive.plist`

**Interfaces:**
- Consumes: Task 1's exit-1 stdout payload.
- Produces: #command posts mentioning JUV (pubkey `828f505e354b0a381a807eb44300c91b312f7cabd07d21689812ffbe4c2a56b5`), and a Buzz.app process that relaunches on crash (ALLOCATION §8 — 24/7 unattended depends on this).

- [ ] **Step 1: Write the monitor plist** — `StartInterval` 900, `ProgramArguments` runs a
  wrapper that executes monitor.sh and, on exit 1, posts:

```bash
#!/bin/bash
# ~/.buzz/monitor/run.sh — launchd wrapper
OUT=$(/Users/po/.buzz/monitor/monitor.sh)
if [ $? -eq 1 ]; then
  KEY=$(security find-generic-password -s buzz-desktop -a secrets -w | python3 -c 'import sys,json;print(json.load(sys.stdin)["identity"])')
  BUZZ_PRIVATE_KEY="$KEY" BUZZ_RELAY_URL=https://hvg.app buzz messages send \
    --channel fdf5cf79-6269-460c-bd3a-37c52c3397d9 \
    --content "@JUV WATCHER: $OUT" \
    --mention 828f505e354b0a381a807eb44300c91b312f7cabd07d21689812ffbe4c2a56b5
fi
```

- [ ] **Step 2: Write the keepalive plist** — `KeepAlive: true`, `RunAtLoad: true`,
  launching the installed Buzz.app binary (`open -na` form so macOS doesn't fork a second
  instance). This is the crash → relaunch guarantee; Peter never restarts the hive by hand
  again.
- [ ] **Step 3: Load and verify both**

```bash
launchctl load ~/Library/LaunchAgents/app.hvg.monitor.plist
launchctl load ~/Library/LaunchAgents/app.hvg.buzz-keepalive.plist
```
Expected: `launchctl list | grep hvg` shows both jobs. Stage the Task-1 disk-threshold
failure, run the wrapper by hand, confirm the @JUV post lands in #command. Then kill the
Buzz.app process and confirm the keepalive relaunches it within 30 seconds.

- [ ] **Step 4: Commit** — wrapper + copies of both plists into the `~/.buzz` repo, push.

### Task 3: Concurrency file + HOLD enforcement (YBY, #build)

YBY's first task post-P11 — small, verifiable, and doubles as proof his grok runtime is
truly back before he takes B1.

**Files:**
- Create: `/Users/po/.buzz/max-agents` (contents: `3`)
- Modify: `~/.buzz/monitor/monitor.sh` — append the cap check below.

**Interfaces:**
- Produces: `~/.buzz/max-agents` read by the watcher and by JUV before every dispatch.

- [ ] **Step 1:** `echo 3 > /Users/po/.buzz/max-agents`
- [ ] **Step 2:** Append to monitor.sh:

```bash
# 7. CONCURRENCY: live agent processes vs cap
CAP=$(cat /Users/po/.buzz/max-agents 2>/dev/null || echo 3)
LIVE=$(pgrep -f buzz-acp | wc -l | tr -d ' ')
[ "$LIVE" -gt "$CAP" ] && \
  PROBLEMS+=("CAP: $LIVE agents live, cap is $CAP. Owner: JUV posts HOLD, queues overflow.")
```

- [ ] **Step 3:** Test: `echo 1 > ~/.buzz/max-agents`, run monitor.sh, expect the CAP line
  (live count > 1). Restore to 3. Commit + push in the `~/.buzz` repo.

### Task 4: Desktop concurrency toggle (YBY, #build — after B1 lands; MFR reviews the PR)

**Files:**
- Modify: `desktop/src/features/settings/` — add the control where agent settings live
  (follow the existing settings-page pattern; check `desktop/src/features/` for the agent
  edit surface)
- Create/Modify: a Tauri command in `desktop/src-tauri/src/` that writes the file
  (follow the existing `#[tauri::command]` pattern in `managed_agents/`)

**Interfaces:**
- Consumes: `~/.buzz/max-agents` semantics from Task 3.
- Produces: a 3-way control (1 / 2 / 3) labeled "Max concurrent agents"; writes the same
  file the watcher and JUV read. No other state.

- [ ] **Step 1:** Tauri command `set_max_agents(n: u8)` — validates n in 1..=3, writes
  `/Users/po/.buzz/max-agents` (use the home dir, never a hardcoded absolute path), returns
  the written value. Rust unit test: n=0 and n=4 are rejected.
- [ ] **Step 2:** UI control — three-option segmented button, current value read from the
  file on mount. rem-based text tokens only (AGENTS.md zoom rule); Biome clean.
- [ ] **Step 3:** Verify: click 1 → `cat ~/.buzz/max-agents` prints `1`; run monitor.sh →
  CAP line appears if over. Click 3 → CAP line gone.
- [ ] **Step 4:** `cargo test --manifest-path desktop/src-tauri/Cargo.toml` +
  `pnpm -C desktop build`. Commit with `-s`, PR per repo rules.

### Task 5: Subscription window table (SLM drafts, #research; PAT verifies sources)

**Files:**
- Modify: `docs/ALLOCATION.md` §1 — replace each `*(PAT)*` with verified mechanics.

**Interfaces:**
- Produces: the window/cap table JUV's pacing rules consume (ALLOCATION §3).

- [ ] **Step 1 (SLM):** For each of Claude, Kimi, Grok, ChatGPT/Codex, Gemini: document the
  window type, cap, and reset behavior from provider docs (cite URL + access date) plus
  any observed rate-limit events in harness logs (quote the log line). This is benchmark
  rigor applied to provider limits — your lane.
- [ ] **Step 2 (SLM):** Where docs and observation disagree, observation wins — note the
  conflict explicitly.
- [ ] **Step 3 (PAT):** source-check every claim, sign off in the commit message.
  Unknown stays written as UNKNOWN with a date — never guessed.
- [ ] **Step 4 (SLM):** Commit with `-s`, push to main.

### Task 6: Per-agent env matrix (PAT drafts, MIA clears, TIP applies, SLM verifies)

**Files:**
- Create: `docs/ENV_MATRIX.md` — one row per agent: runtime(s) it may fail over into,
  required env vars per runtime, where each value comes from (keychain item name, not the
  value).
- Modify: `managed-agents.json` via Desktop only (Edit Agent → Advanced → Environment
  Variables) — never by hand-editing the JSON in this task.

**Interfaces:**
- Consumes: TOOL_PARITY §4 per-runtime requirements; Task 5's provider facts.
- Produces: every agent smoke-tested on every runtime it may fail over into (ALLOCATION §6).

- [ ] **Step 1 (PAT):** draft the matrix. Columns: agent, home runtime, failover runtimes,
  vars per runtime, source, cleared-by-MIA checkbox.
- [ ] **Step 2 (MIA):** clearance pass — anything touching secrets gets a written yes/no
  in the doc.
- [ ] **Step 3 (TIP):** apply via Desktop; one-turn smoke task per agent per failover
  runtime ("reply with your model name").
- [ ] **Step 4 (SLM):** verify every smoke result against the matrix — the row doesn't
  count until SLM confirms the reported model matches the target runtime. Paste results
  into the matrix. Push after each stage.

### Task 7: Weekly utilization report (PAT authors, SLM gathers, #research)

**Files:**
- Create: relay note template (NIP-23 via `buzz notes publish`) — sections below.

**Interfaces:**
- Consumes: watcher state (Task 1), harness logs, board history.
- Produces: the Monday report JUV and Peter read; drives ALLOCATION *(tune)* corrections.

- [ ] **Step 1 (SLM):** gather the inputs — watcher state (Task 1), harness logs, board
  history — into the week's raw numbers.
- [ ] **Step 2 (PAT):** author from the template. Sections: idle-window-hours (count of
  15-min watcher windows with zero live cards); burn % per subscription vs. cap;
  exhaustion events (target 0); task-to-tier mismatches; plan-artifact-to-card-set
  velocity per brand.
- [ ] **Step 3 (PAT):** First report runs the Monday after the watcher has 7 days of data.
  Publish as a relay note titled `UTILIZATION <date>`; link it in #command.
- [ ] **Step 4 (PAT):** Every *(tune)* ratio the report corrects gets edited into
  `docs/ALLOCATION.md` in the same week, committed with the report's date.

### Task 8 (DEFERRED): Ambiguous-anomaly summarizer (TIP, #build)

Trigger condition only: the first time a watcher anomaly is not templated (dead agent /
disk / relay / cap), add the gemini flash-class summarizer between payload and post per
MONITORING.md. Until then, templated alerts are the whole system. Do not build early.

---

## Self-review notes

Coverage: ALLOCATION §2 floors → Global Constraints + P8 update (done); §3 pacing →
Tasks 1/5/7 + JUV's P9 rules (done); §5 concurrency → Tasks 3/4; §6 env → Task 6;
§7 learning loop → Task 7; §8 24/7 machinery → Tasks 1/2 (watcher + Buzz.app keepalive);
§1 windows → Task 5. Load spread: TIP (1, 6-apply, 8-deferred), TUN (2 + keepalive),
YBY (3, 4-after-B1), SLM (5, 6-verify, 7-gather), PAT (6-draft, 7-author), MIA (6-clear),
MFR (4-review). Type consistency: state keys, file paths, and the JUV pubkey are identical
across tasks. Deferred: B2 absorption (MFR's existing card, unchanged), Ollama/local model
(rejected 2026-08-22).
