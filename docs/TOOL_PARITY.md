# TOOL PARITY — CAPABILITY × RUNTIME MATRIX AND INSTALL PLAN

**Companion to:** [`TOOLING.md`](./TOOLING.md) (owns the model and the gate — this document is the matrix TIP maintains)
**Status:** ACTIVE · **Verified:** 2026-08-21, against local configs and official sources, not from memory.

The rule (`TOOLING.md` §1): **every runtime carries an implementation of every capability its
agents need. Not the same package — the same capability.** A capability is only "installed" when
every runtime whose agents need it can invoke it.

---

## 1. DEMAND — WHICH RUNTIME NEEDS WHICH KIT

Demand is roster × squad (`SQUADS.md` §2), nothing else. A runtime is not kitted for a squad
that has no agent on it.

| Runtime | Agents | Kits needed |
|---|---|---|
| **claude** | ICBM, YAK, MFR, MIA, ROO | standard + Command + Build + Creative + Trust |
| **grok** | 3TH, BOO, LDA, PAT, TIP, VON, YBY | standard + Build + R&D + Creative + Growth + Ship |
| **codex** | IVY, JUV | standard + Command + Growth |
| **cursor** | NKI, SLM | standard + R&D + Trust |
| **kimi** | PMP, TUN | standard + Build + Growth |
| **goose** | *none assigned* | standard baseline only |

**Config mechanism per runtime** (where TIP installs):

| Runtime | Mechanism |
|---|---|
| claude | `~/.claude/plugins/installed_plugins.json` + `settings.json` enabledPlugins; user MCPs in `~/.claude.json` |
| grok | `~/.grok/config.toml` `[mcp_servers.*]` + xAI plugin marketplace — **and auto-loads all Claude plugins/MCPs/skills** (verified in README §"Claude Code Compatibility") |
| codex | `~/.codex/config.toml` `[mcp_servers.*]` + `[plugins.*]` |
| cursor | `~/.cursor/mcp.json` — **does not exist yet; zero MCPs configured** |
| kimi | `~/.kimi-code/mcp.json` + `~/.kimi-code/plugins/` (`/plugins install <github-url>`) |
| goose | `~/.config/goose/config.yaml` `extensions:` + `~/.config/goose/skills/` |

---

## 2. THE MATRIX

Cell = verified package, `INSTALL` (verified package exists, not yet wired), `GAP →` resolution,
or `·` (not needed by that runtime's squads).

### Standard issue (every agent)

| Capability | claude | grok | codex | cursor | kimi | goose |
|---|---|---|---|---|---|---|
| Filesystem r/w | native | native | native | native | native | native (`developer` ext) |
| Git + GitHub | `github` MCP ⚠️w | same via Claude-compat + `gh` ⚠️w | `github` plugin ⚠️w | `gh` CLI ⚠️w | `gh` CLI ⚠️w (configured MCP is the **deprecated** `@modelcontextprotocol/server-github` — replace) | `gh` CLI ⚠️w |
| Web fetch + search | native | native — set `GROK_WEB_FETCH=1` | native + `browser` plugin | native | native (`moonshot_search`/`moonshot_fetch`) | **GAP** — INSTALL `uvx mcp-server-fetch`; search needs a keyed API (Brave/Tavily) or REROUTE |
| Docs lookup | `context7` MCP | same via compat | `context7` plugin | INSTALL `@upstash/context7-mcp` | `context7` MCP (in `mcp.json`) | INSTALL context7 extension |
| Board read/write | `buzz` CLI — universal, all runtimes, no work ||||||

### Squad kits

| Capability | claude | grok | codex | cursor | kimi |
|---|---|---|---|---|---|
| **Command:** github | ✅ covered above | · | ✅ covered above | · | · |
| **Build:** typescript-lsp | ⚠️ plugin present, **binary missing** — `npm i -g typescript-language-server typescript` | native LSP (`~/.grok/lsp.json`, same npm binary) | · | · | CLI baseline `npx tsc --noEmit`; optional `agent-lsp` MCP |
| **Build:** playwright | `playwright` MCP | same via compat | · | · | `playwright` MCP — ⚠️ remove `--allow-unrestricted-file-access` |
| **Build:** supabase | `supabase` MCP ⚠️w | same via compat ⚠️w | · | · | INSTALL `@supabase/mcp-server-supabase` ⚠️w |
| **R&D:** playwright / context7 / web search | · | ✅ all three | · | INSTALL playwright + context7; search native | · |
| **Creative:** frontend-design | `frontend-design` + user skills | same via compat | · | · | · |
| **Creative:** image generation | **GAP → REROUTE to grok** (native `image_gen` + `imagine` skill). No verified image-gen MCP worth installing. | ✅ native | · | · | · |
| **Growth:** SEO analysis | · | `claude-seo` via compat | `claude-seo` plugin enabled | · | **`kimi-seo` is REAL but NOT INSTALLED** — INSTALL (`/plugins install https://github.com/bentocodeing/kimi-seo`). Third-party fork of claude-seo, runs ~53 Python scripts — PAT verifies, trust prompt expected |
| **Growth:** resend (email) | · | `resend` MCP ⚠️w | `resend` plugin ⚠️w | · | INSTALL `resend-mcp` ⚠️w |
| **Growth:** web analytics | · | **GAP** | **GAP** (Google's official `google-analytics-mcp` verified, unwired) | · | **GAP** |
| **Trust:** code-review | `code-review` plugin + skill | · | · | INSTALL CodeRabbit CLI (⚠️ source diffs leave machine) | · |
| **Trust:** dep/secret scanning | ⚠️ PARTIAL — `gitleaks` brew install broken, reinstall | · | · | INSTALL `osv-scanner` + `semgrep-mcp` + `gitleaks` | · |
| **Ship:** vercel / gh actions / railway | · | ✅ vercel (compat + xAI marketplace) · `gh run/workflow` · railway (xAI marketplace plugin — pin SHA) ⚠️w | · | · | · |

⚠️w = holds write access (repos / customer data / money / deploys) — **read-only until MIA
clears it** (`TOOLING.md` §5 rule 4).

---

## 3. GAP REGISTER — EVERY HOLE AND ITS RESOLUTION

| # | GAP | Runtime | Resolution |
|---|---|---|---|
| 1 | Image generation | claude (YAK, ROO) | **REROUTE** to grok — LDA already owns media production and grok generates natively. No install. |
| 2 | Web analytics | grok, codex, kimi | **Standardize on Vercel Web Analytics** — every brand site deploys to Vercel (card F1), and the `vercel` MCP already exposes `get_web_analytics` on claude/grok/kimi today. Codex/cursor add the same remote MCP (`https://mcp.vercel.com`). One vendor, no new tooling. |
| 3 | SEO on kimi | kimi (PMP) | **INSTALL kimi-seo** — verified real (github.com/bentocodeing/kimi-seo). PAT verifies before TIP installs. |
| 4 | resend, supabase | kimi (PMP, TUN) | **INSTALL** both MCPs. |
| 5 | playwright, context7, scanners | cursor (NKI, SLM) | **INSTALL** — cursor is zero-config today; whole kit lands in one `~/.cursor/mcp.json`. |
| 6 | typescript-language-server binary | claude, grok (MFR, 3TH, YBY) | **INSTALL** — one npm command, shared by both runtimes. |
| 7 | Secret scanning | claude (MIA) | **INSTALL** — `brew install --force gitleaks` (current keg broken). |
| 8 | Web search / fetch / docs | goose | INSTALL fetch + context7 extensions; **search = REROUTE** until a search API key is provisioned. No agents on goose, so nothing blocks. |
| 9 | Deprecated github MCP | kimi | **REPLACE** with remote `https://api.githubcopilot.com/mcp/` or drop to `gh` CLI only. |

---

## 4. PER-RUNTIME INSTALL PLAN — TIP EXECUTES, PAT VERIFIES, MIA CLEARS ⚠️w FIRST

Order: MIA clearance for ⚠️w items → install → PAT confirms **reachability per runtime**
(S3 exit criterion), not config presence.

### claude (ICBM, YAK, MFR, MIA, ROO) — 2 fixes, otherwise full
```bash
npm install -g typescript-language-server typescript   # un-degrades typescript-lsp
brew install --force gitleaks                          # current install is broken
```
Image generation stays REROUTEd to grok. Nothing else to source — 15/17 capabilities verified live.

### grok (3TH, BOO, LDA, PAT, TIP, VON, YBY) — nearly free
```bash
npm install -g typescript-language-server typescript   # shared with claude
```
- Set `GROK_WEB_FETCH=1` in grok agent environments.
- Install `railway` from the already-configured xAI marketplace (`~/.grok/config.toml` sources it) — **pin the SHA from the marketplace catalog**, MIA clears before use (infra write).
- Everything else (github, context7, playwright, supabase, resend, vercel, claude-seo, frontend-design) **already loads via Claude Code compatibility**. Verify with `grok inspect`.

### codex (IVY, JUV) — env + one stanza
- Already enabled: github, context7, resend, claude-seo, browser. Action is env only:
  `GITHUB_PERSONAL_ACCESS_TOKEN` (fine-grained, portfolio org only) in the agent environment.
- Analytics: add the Vercel remote MCP per gap 2 (or Google's `google-analytics-mcp` if GA4 is ever adopted):
```toml
# ~/.codex/config.toml
[mcp_servers.vercel]
url = "https://mcp.vercel.com"
```

### cursor (NKI, SLM) — whole kit from zero, one file
```jsonc
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "playwright":  { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "context7":    { "url": "https://mcp.context7.com/mcp" },
    "semgrep":     { "command": "uvx", "args": ["semgrep-mcp"] },
    "osv-scanner": { "command": "osv-scanner", "args": ["experimental-mcp"] }
  }
}
```
```bash
brew install gitleaks osv-scanner
```
Verify with `cursor-agent mcp list`. CodeRabbit CLI optional (⚠️ diffs leave machine — MIA's call).

### kimi (PMP, TUN)
1. Edit `~/.kimi-code/mcp.json`: replace deprecated `@modelcontextprotocol/server-github` with
   remote `https://api.githubcopilot.com/mcp/`; remove `--allow-unrestricted-file-access` from
   the playwright entry.
2. In a kimi session: `/plugins install https://github.com/bentocodeing/kimi-seo` → `/reload`
   (PAT verification first — third-party fork).
3. Add `resend-mcp` and `@supabase/mcp-server-supabase` entries (MIA clears keys — send scope,
   DB write).
4. Add the Vercel remote MCP per gap 2 (or use the installed `vercel-plugin`, which already
   exposes `get_web_analytics`).

### goose (unstaffed) — baseline only
```yaml
# ~/.config/goose/config.yaml → extensions:
fetch:    { enabled: true, type: stdio, cmd: uvx, args: ["mcp-server-fetch"], timeout: 300 }
context7: { enabled: true, type: stdio, cmd: npx, args: ["-y", "@upstash/context7-mcp"], timeout: 300 }
```
Web search stays GAP → REROUTE until a search API key exists. ⚠️ `GOOSE_MODE: auto` auto-approves
tool calls — revisit before any ⚠️w extension is added.

### Standard-issue additions — ponytail + headroom (mandated by Peter, 2026-08-21)

Every runtime, always on, no per-turn action — both are install-once by construction. PAT
verifies adapters, MIA clears (one runs per-prompt hooks, one sees all LLM traffic), TIP installs.

| Runtime | ponytail — minimal build | headroom — compression + terse output |
|---|---|---|
| claude | `/plugin marketplace add DietrichGebert/ponytail` → `/plugin install ponytail@ponytail` (node on PATH ✅) | MCP entry **already in `~/.claude.json`** — PAT verifies mode; proxy via `headroom wrap claude` |
| grok | `grok plugin install DietrichGebert/ponytail --trust`, then `[plugins] enabled=["ponytail"]` in `~/.grok/config.toml`; verify with `grok inspect` | `headroom wrap grok` ✅ (routes via `GROK_MODELS_BASE_URL`) |
| codex | `codex plugin marketplace add DietrichGebert/ponytail` → `codex plugin add ponytail@ponytail`; trust the two hooks via `/hooks` | `headroom wrap codex` ✅ |
| cursor | copy `.cursor/rules/ponytail.md` from a repo checkout — instruction-only, no commands | manual: `headroom proxy --port 8787`, set base URLs in Cursor settings |
| kimi | **no native adapter — PAT verifies the path.** Candidate: user skill at `~/.agents/skills/ponytail/` (kimi loads that tree); AGENTS.md fallback also works | `headroom wrap kimi` ✅ (OAuth bearer forwarded) |
| goose | **PAT verifies.** Candidate: `~/.config/goose/skills/ponytail/` | `headroom wrap goose` ✅ |

One CLI install serves every runtime: `uv tool install --python 3.13 "headroom-ai[all]"`
(`uv` on PATH ✅, needs python 3.13). Harness-spawned headless agents don't run interactive
`wrap` — TIP points each runtime's model base-URL env at the local proxy in the managed-agents
config instead; PAT supplies the per-runtime env var names.

**Always-on, every session/turn:** ponytail defaults to `full` each session
(`PONYTAIL_DEFAULT_MODE` env or `~/.config/ponytail/config.json`); headroom shapes every request
once the proxy is in the path. **Set `HEADROOM_OUTPUT_SHAPER=1` before the first wrap — that is
the terse-output switch** (verbosity steering + effort routing). On a shared proxy the last
shaper setting wins fleet-wide — run one proxy per runtime, or accept shared settings.

**caveman** — the terse-prose skill — ships inside the ponytail repo:
`npx skills add DietrichGebert/ponytail --skill caveman -g`. ponytail shrinks what agents
**build**; caveman shrinks what they **say**. Same clearance pass as ponytail.

---

## 5. MIA CLEARANCE QUEUE — READ-ONLY UNTIL CLEARED

| Tool | Write scope | On runtimes |
|---|---|---|
| headroom | sees 100% of LLM traffic incl. auth bearer forwarding; "local-first, reversible" is their claim — PAT verifies it, MIA clears before wrap | all |
| ponytail (+ caveman) | lifecycle hooks execute third-party Node code on every prompt | all |
| github MCP / `gh` PAT | repos | all — use fine-grained PAT, portfolio org only |
| supabase MCP | customer data (SQL write) | claude, grok, kimi |
| resend MCP | **sends email — gated action #4 (customer contact) applies to every send** | grok, codex, kimi |
| vercel MCP | deploys to production | claude, grok, kimi, codex |
| railway plugin | infra spend/control | grok |
| kimi-seo | third-party code, runs local Python | kimi — PAT verifies source first |
| CodeRabbit CLI | source diffs leave the machine | cursor |

---

## 6. VERIFIED CORRECTIONS — 2026-08-21

| Claim | Finding |
|---|---|
| "Kimi has kimi-seo" | **Half true.** kimi-seo is real (third-party claude-seo fork) but **not installed** — `~/.kimi-code/plugins/managed/` holds only kimi-datasource, superpowers, vercel-plugin. |
| "Install ponytail + headroom on every runtime" | **Both verified real** (2026-08-21). headroom is already partially present (MCP entry in `~/.claude.json`). ponytail has native adapters for claude/grok/codex, rules-copy for cursor; **kimi and goose adapters unverified — PAT's first two checks.** headroom `wrap` supports all six runtimes except cursor (manual proxy). |
| "Claude has 16 plugins" | **True** — 16/16 confirmed in `installed_plugins.json` + `settings.json`. |
| claude `typescript-lsp` | Plugin is a shim; backing binary missing. Degraded until the npm install above. |
| kimi github MCP | Configured package is archived/deprecated. Replace. |
| cursor tooling | `cursor-agent` installed; **zero MCPs configured**. Everything is an install, nothing is a fix. |
| grok coverage | Best-covered runtime in the fleet: native MCP/LSP/image-gen + xAI marketplace + full Claude plugin compat. TIP and VON (Ship) and PAT (verification) are well placed there. |

**Runtime reassignment check (handoff §7, step 4):** TUN on kimi is fine — kimi's Build kit is
fully coverable (three MCPs already configured, two installs queued). No reassignment is cheaper
than the tool installs above. The only permanent reroute is claude image generation → grok (LDA),
which matches the squad structure anyway.
