# INCIDENTS — what broke, what fixed it, what watches for it now

Newest first. Every entry: symptom, root cause (verified, not derived), fix, and the
permanent guard. If an incident has no guard, it will repeat.

## 2026-08-22 — The hive-outage day (four linked failures)

**I1. Disk full (1 GiB free).** Symptom: TUN's kimi session `write failed: ENOSPC`,
session state poisoned, the poisoned batch retried 10× over hours looking like a live
outage. Root: 26.6 GB of stale Rust targets in `~/.buzz/REPOS` + ~52 GB of stale caches
and an unused 28 GB LM Studio install. Fix: cleared (81 GiB free). **Guard:** watcher disk
check (ALLOCATION_PLAN Task 1, first check written); TUN's rule — a poisoned batch is
dropped, never retried past the window that poisoned it.

**I2. grok CLI auto-update broke headless spawn.** Symptom: 8 grok-runtime agents (LDA,
YBY, PAT, 3TH, BOO, Bumble, TIP, VON) restart-looping `ENXIO Device not configured` from
2026-08-21 08:53 UTC — 330 loops for LDA, a full day. Root: grok 1.0.5 (auto-updated
08-21 02:12) — bare `grok agent` opens an interactive pager needing a tty; ACP actually
lives at `grok agent stdio`. Fix: shim `~/.local/bin/grok-acp-pty` (conditional `stdio`
append — the catalog passes it on some paths; a blind append doubles it and grok exits
with a usage error), all 8 agents pinned via `agent_command_override`. Verified: 10-agent
pool initialized clean 14:35 UTC. **Guard:** MFR card — catalog resolves `grok agent
stdio` natively + pin the grok CLI version. Shim then retires.

**I3. Dispatch events eaten by dead harness instances.** Symptom: "all agents stopped"
after a clean relaunch — dispatches posted while zombie harnesses were alive were consumed
by them; fresh instances saw nothing. Fix: regenerate triggers (fresh @mention posts).
**Guard:** watcher anomaly = "harness process alive but no `agent_pool_ready` in the log
tail" (not just process count); auto-remediation below.

**I4. Wrong theory cost ~2 hours.** The ENXIO was initially diagnosed as "grok needs a
PTY" and the first shim made it worse (spoke no protocol; then doubled `stdio`). Lesson
now written into the team's debug rule: verify the handshake, not the spawn. A process
that starts is not a process that speaks.

**I5. "Board repair needs PR #18 + B1 verbs" was never true for the destructive half.**
The team waited six days for `board retire`/`board set` while K&B Concrete and MoSober
sat visible. Root of the wait: nobody checked whether the relay already honors NIP-09.
It does (side_effects.rs soft-deletes addressable kinds by `a` tag, one target per event).
On 2026-08-22 the whole repair ran raw: both boards deleted, `three` retitled "We 3 Live"
(LWW republish from the owner key), 5 junk unified-master cards deleted, unified-master
normalized to 5 columns — verified `board ls`. **Guard:** EXECUTION_PROMPTS P5 is closed;
B1 narrows to UX verbs. Rule of thumb now in SWO §7's fix rule: before writing a verb,
check whether the protocol already does it.

## Standing auto-remediation ladder (P13 — the team builds this)

| Level | Trigger | Action | Owner |
|---|---|---|---|
| Expose | any watcher anomaly | post to #command @JUV | TIP (built, Tasks 1-2) |
| Expose + fix | pool-dead pattern (I3) | watcher re-posts the pending dispatch mention itself | TIP |
| Fix | pool-dead OR init-exhausted | watcher bumps `updated_at` in managed-agents.json to force respawn; if that fails twice, page Peter | TIP + MFR |
| Fix | disk < 10 GiB | watcher clears `~/.buzz/REPOS/*/target` and known-rebuildable caches before posting | TIP |
