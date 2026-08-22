# TOOLING — HOW AGENTS GET TOOLS

**Companion to:** [`WORKFLOW.md`](./WORKFLOW.md) · [`SQUADS.md`](./SQUADS.md) · [`STANDING_WORK_ORDER.md`](./STANDING_WORK_ORDER.md)
**Status:** ACTIVE. Owns stage **S3 Equip**.

---

## 1. CURRENT STATE — VERIFIED 2026-08-21

| Environment | Tools |
|---|---|
| **Peter's Claude Code** | **16 plugins** — `github` `context7` `playwright` `vercel` `supabase` `resend` `claude-seo` `frontend-design` `typescript-lsp` `code-review` `code-simplifier` `feature-dev` `superpowers` `skill-creator` `claude-code-setup` `i-have-adhd` |
| **`.buzz/.mcp.json`** | **1 MCP server — `shadcn`** |

### The team runs FIVE different runtimes — this is the fact that governs everything

From `managed-agents.json`, verified 2026-08-21:

| Runtime | Agents | Inherits `~/.claude` plugins? |
|---|---|---|
| **claude** | ICBM, YAK, MFR, MIA, ROO | ✅ **Yes** — all 16 plugins available |
| **grok** | 3TH, BOO, LDA, PAT, TIP, VON, YBY | ❌ No — xAI runtime, separate config |
| **codex** | IVY, JUV | ❌ No — own MCP config |
| **cursor** | NKI, SLM | ❌ No — own MCP config |
| **kimi** | PMP, TUN | ❌ No — own MCP config |

**5 of 18 agents inherit the plugins. 13 do not.** "It's on the machine so the harness has it" is
true for the claude-runtime agents and false for everyone else — including **TUN**, who holds the
board key and executes every Phase 0 write, and **PAT**, who owns tool verification.

### The rule that follows — CAPABILITY PARITY PER RUNTIME

**The unit of tooling is a capability, not a package.** `claude-seo` and `kimi-seo` are two
implementations of one capability: *SEO analysis*. An agent needs the capability; which package
delivers it is a per-runtime detail.

> **Every runtime must carry an implementation of every capability its agents need.**
> Not the same package — the same capability.

TIP maintains a **parity matrix**: capability × runtime → package, or `GAP`. A capability with a
`GAP` on a runtime means the agents on that runtime cannot do that work, and either the package
gets found, the capability ships as a CLI, or the work reroutes to an agent on a runtime that has it.

| Tool form | Reach | Use when |
|---|---|---|
| **CLI on `PATH`** — `buzz`, `gh`, `git`, `vercel` | All 18 agents, all runtimes | The whole team needs it, or no per-runtime package exists |
| **Per-runtime package** — `claude-seo` / `kimi-seo` / equivalents | Only that runtime's agents | A native implementation exists and is better than a CLI |

**Prefer a CLI only when parity cannot be achieved**, not as a default. A native package usually
beats shelling out; the CLI is the fallback that guarantees reach.

Two things this makes urgent:
- **`buzz huddle`** (`SQUADS.md` §7 gap 1) — Desktop-only today, so unreachable for all 18. As a
  CLI it reaches everyone; as an MCP it would need six implementations.
- **Six runtimes, not five.** `claude` · `grok` · `codex` · `cursor` · `kimi` · **`goose`**
  (`.buzz/.goose` exists; commit `c6416f2b` references goose custom-provider resolution). The
  parity matrix has six columns even though `managed-agents.json` currently assigns only five.

DEE's profile named four MCPs — `theological-integrity-mcp`, `ethical-alignment-auditor-mcp`,
`faith-narrative-skills`, `we3-ministry-engine-mcp`. **None exist.** That is what speculative tool
listing produces, and it is the failure mode this document prevents.

### Tools already installed that map to already-filed cards

Nothing needs to be sourced for these. They need to be wired.

| Filed card | Board | Tool already on the machine |
|---|---|---|
| F1 — Repo scaffold + deploy pipeline | `clean` | `vercel` |
| F2 — Design foundation, tokens, type scale | `clean` | `frontend-design` |
| C4 — Local SEO foundation | `clean` | `claude-seo` |
| H3 — Review structured data (`Review`/`Product` schema) | `itshvg` | `claude-seo` |
| H4 — Newsletter capture and provider | `itshvg` | `resend` |
| Board repair, PR #18 rescue | `hvgapp` | `github`, `typescript-lsp`, `code-review` |

**First tooling action is not a search. It is building the parity matrix.** TIP, in order:
1. List the capabilities each squad needs (§3).
2. For each capability × each of the six runtimes, find the native package — `claude-seo`,
   `kimi-seo`, and their equivalents on grok / codex / cursor / goose.
3. Install them per runtime. Mark every hole `GAP`.
4. For each `GAP`: find a CLI, or reroute that work to a runtime that has the capability.

**A capability is only "installed" when every runtime whose agents need it can invoke it.**

---

## 2. THE RULE

**Nobody shops. Tools arrive when work demands them.**

An agent does not know what it needs until a card is blocked. Ask an idle agent what tools it
wants and you get a wishlist; ask a blocked agent and you get a requirement.

---

## 3. THREE TIERS

| Tier | What | Decided by | When |
|---|---|---|---|
| **Standard issue** | Base set every agent gets. Decided **once**, never re-researched. | TIP + MIA | Before Phase 1a |
| **Squad kit** | Function tools for a squad's whole remit. | Squad lead proposes → MIA clears | Phase 0 |
| **On demand** | Everything else. | Agent files against the **blocked card** | Whenever a card blocks |

### Standard issue — proposed

Capabilities, not packages. PAT nominates the implementation for each.

| Capability | Nomination |
|---|---|
| Filesystem read/write | native |
| Git + GitHub — issues, PRs, CI | `github` |
| Web fetch + search | native |
| Library/API documentation lookup | `context7` |
| Board read/write | `buzz board` CLI |

### Squad kits — proposed

| Squad | Kit |
|---|---|
| **Command** | `github`, `buzz board` |
| **Build** | `github`, `typescript-lsp`, `context7`, `playwright`, `supabase` |
| **Research & Data** | `playwright`, `context7`, web search |
| **Creative** | `frontend-design`, image generation *(gap — no tool installed)* |
| **Growth** | `claude-seo`, `resend`, analytics *(gap — no tool installed)* |
| **Trust & Safety** | `code-review`, dependency/secret scanning *(gap)* |
| **Ship** | `vercel`, `github` Actions, `railway` |

Four real gaps: image generation, analytics, dependency scanning, and — per `SQUADS.md` §7 gap 1
— **anything that lets a headless agent join a Huddle.** Those are the only genuine research
tasks. Everything else is wiring.

---

## 4. WHERE IT SITS IN THE WORKFLOW — S3 EQUIP

Tool research gets a **designated stage before Build.** It cannot go earlier: "what tools do we
need" is only answerable against "what are we building," which S2 Model produces. It cannot go
later: agents entering Build without tools improvise with whatever is at hand, and that choice
becomes permanent.

```
S0 Define → S1 Found → S2 Model → S3 EQUIP → S4 Build → S5 Verify → S6 Prep → S7 Publish → S8 Operate
                          │           │
                          │           └── tool gap closed before a line is written
                          └── the Spec Huddle output ENUMERATES the tool gaps
```

**No new huddle.** The Spec Huddle at S2 already produces the spec — it now also produces the
tool gap list. S3 Equip is execution, not discussion: verify, clear, install.

**S3 exit criteria:** every tool named in the S2 spec is installed, cleared, and confirmed
reachable by the agent who will use it. An agent that cannot reach its tool is not equipped, no
matter what the config says.

---

## 5. THE GATE — FIVE QUESTIONS, IN ORDER

| # | Question | Fails if |
|---|---|---|
| 1 | **Which card is blocked without this?** | No card named. This kills most requests. |
| 2 | **Does something already in the stack do it?** | Duplicate capability — worse than missing capability. |
| 3 | **Who publishes it, and what permissions does it hold?** | Write access to DNS, repos, money, or customer data → **auto-escalates to MIA**. |
| 4 | **Read-only until vetted.** | Any write-capable tool used before MIA clears it. |
| 5 | **Stars, recency, activity** | Tiebreaker between two tools that already passed 1–4. **Never the criterion.** |

Rule 4 is Peter's own, generalized. From `BOARD_SEED_PRIORITY_BRANDS.md` §5a on the Namecheap
CLI: *"an unvetted third-party tool that would hold DNS write access, which is enough to take
every brand site offline in one bad call… it should be used read-only until it has been [read]."*
That reasoning does not stop applying because an agent picked the tool instead of Peter.

---

## 6. OWNERSHIP CHAIN

> **Agent nominates → PAT verifies → MIA clears → TIP installs once, centrally**

| Role | Owns |
|---|---|
| **Agent** | Names the blocked card and the missing capability. Nominates candidates. Does not install. |
| **PAT** | Hands-on verification. **This is already his mandate** — "Deep Research & Tool Verification." |
| **MIA** | Security, privacy, permissions. Auto-invoked by question 3. |
| **TIP** | Installs into `.buzz/.mcp.json` **once, for everyone**. No per-agent private toolchains. |

Marketplace browsing (`claudemarketplaces.com` and others) is the **nomination** step, not the
decision. Agents may point at candidates; PAT decides.

---

## 7. THE REQUEST TEMPLATE

Filed as a comment on the blocked card. Not a thread, not a DM.

```
TOOL REQUEST
BLOCKED CARD:   <card id + title + brand slug>
CAPABILITY:     <what it must do — a capability, not a package name>
ALREADY TRIED:  <what in the current stack fails, and how>
CANDIDATES:     <1-3, with publisher and permission scope>
WRITE ACCESS:   <none | repos | dns | money | customer data>
BLOCKING:       <yes — work stops | no — slower without it>
```

`WRITE ACCESS` anything but `none` routes to MIA automatically.
`BLOCKING: no` goes in the queue, not the front of it.

---

## 8. WHY THIS PAYS FOR ITSELF

`itshvg`'s brand promise, verbatim from `RESEARCH/BRAND_DEFINITIONS.md`:

> *"We test, use, and review every tool, app, digital product, and service aimed at entrepreneurs
> — heavy focus on AI tools — so small business owners don't waste time or money on the bad ones."*

**Internal tool vetting IS `itshvg`'s product.** PAT benchmarks an MCP because Build is blocked →
YAK writes the review → LDA cuts the video → BOO handles schema. That is the **High Value Growth
Review Flow**, already defined in `TEAM_BRIEFING.md` §4, running on work that has to happen anyway.

Nineteen agents doing private, unrecorded marketplace shopping produces nothing publishable.
One agent doing verified, written, dated evaluations produces the content engine.

**Every S3 Equip evaluation gets written to `.buzz/RESEARCH/TOOL_<NAME>.md`** with a verdict, a
tested-on date, and the card that prompted it. Those files are `itshvg` review drafts — which is
also why `H1 Review content model` should be settled before the first evaluation is written.

---

## 9. STANDING RULES

1. **No card, no tool.** A request without a blocked card is a wishlist.
2. **Capability parity per runtime.** The unit is the capability, not the package. `claude-seo` and `kimi-seo` are the same capability. Every runtime carries an implementation of every capability its agents need.
3. **State the reach.** Every tool decision records which runtimes can invoke it. "It's installed" is not an answer; "kimi and goose have no implementation" is.
4. **CLI is the fallback, not the default.** Prefer the native per-runtime package; ship a CLI when parity cannot be achieved.
5. **Nobody installs their own tools.** TIP installs, per runtime, centrally.
6. **Read-only until MIA clears anything write-capable.**
7. **Every evaluation is written down, dated, and cited.** It is both the audit trail and `itshvg` content.
8. **A capability with a `GAP` on a runtime is not installed.** S3 exits on confirmed reachability per runtime, not on a config entry.
9. **Wire and match before you shop.** 16 plugins already sit on the machine reachable by 5 of 18 agents; most of the rest is finding each runtime's equivalent, not discovering new tools.
