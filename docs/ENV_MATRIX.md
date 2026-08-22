# ENV_MATRIX — per-agent failover readiness

**Status:** LOCKED 2026-08-22 after MIA Step 2. Canonical copy of Task 6.
**Owners:** PAT (matrix) → MIA (secrets) → TIP (Desktop apply) → SLM (smoke verify).
**Ruling:** nest `PLANS/TRUST_S1_AGENT_SECRET_CUSTODY.md` (`b058d41`) + INCIDENTS **I6**
([PR #24](https://github.com/pheartkeys/hvgapp/pull/24)). The nest file is not in this
repo; do not copy secret values out of it.
**Do not hand-edit** `~/Library/Application Support/xyz.block.buzz.app/agents/managed-agents.json`.
Desktop → Edit Agent → Advanced → Environment Variables only.

Hive spend is Max / SuperGrok / ChatGPT Pro / Cursor / Kimi membership. Failover is
**subscription → subscription**. No API key on any runtime.

---

## 1. Premise correction (the draft was wrong)

Task 6 Step 1 assumed `env_keys` (names only) and a keychain item TIP could name.
That is **not** the shipped behaviour.

- The field is **`env_vars`** — a plaintext `name → value` map, written verbatim to
  `managed-agents.json`. Verified live 2026-08-22 by MIA: 18 of 41 records carry
  `env_vars`; **zero secret-shaped values** are present (gate, not a breach).
- There is no keychain indirection on this path. `desktop/src-tauri/src/secret_store.rs`
  holds nsec identity keys only. Desktop Advanced env stores the **value**.
- `desktop/src-tauri/src/migration_databricks_tests.rs:201` asserts
  `env_vars["ANTHROPIC_API_KEY"] == "sk-test"` — the v1→v2 migration is written to
  *preserve* a raw provider key in the map.

Any "yes" on a secret-shaped cell would have been a yes to writing the key in
cleartext, readable by every agent in the pool (one uid, unprivileged `python3` open)
and by every Time Machine snapshot (`tmutil isexcluded` → `[Included]`).

**Nothing is exposed today.** Do not repeat this as a breach.

---

## 2. Classification (MIA, 2026-08-22)

| Class | Examples | Ruling |
|---|---|---|
| **S3** | `PLAID_SECRET`, `PLAID_CLIENT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_ACCOUNT_ID`, `CAP_TABLE_API_KEY`, `LIDAR_PIPELINE_TOKEN`, `CRISIS_NLP_TOKEN`, `ZENDESK_API_TOKEN`, `ESCALATION_WEBHOOK_SECRET` | **NO.** Hard veto until S1 §5 *plus* per-slot MIA review |
| **S2** | `BUZZ_PRIVATE_KEY`, `KUBECONFIG`, `DATABASE_URL`, `GITHUB_TOKEN`, `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `PLAY_SERVICE_ACCOUNT_JSON`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `DISCORD_BOT_TOKEN` | **NO.** `BUZZ_PRIVATE_KEY` already has a home (`secret_store` keychain) — never env. `BUZZ_AUTH_TAG` is **not** in this class — MIA S1b (`616dc2f`): S0, public attestation, not a bearer |
| **S1** | `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `OPENAI_API_KEY`, `CODEX_API_KEY`, `CODEX_ACCESS_TOKEN`, `CURSOR_API_KEY`, `KIMI_API_KEY`, `SERP_INTEL_API_KEY`, Agent Reach / ElevenLabs / Midjourney / Runway / Sora / Apollo / Browserbase / Figma / Amadeus / Duffel / Printful / Shopify admin / Resend / Linear, webhook URLs | **NO** until S1 §5 (keychain indirection + write-path refusal + startup scan) |
| **S0** | `PLAID_ENV`, `SHOPIFY_STORE_DOMAIN`, `BUZZ_RELAY_URL`, `LIDAR_PIPELINE_URL`, `PORTFOLIO_ANALYTICS_URL`, `CRISIS_NLP_URL`, `BUZZ_AUTH_TAG`, `BUZZ_AGENT_OS_*` | **YES.** Plaintext env is the right place for config. Type only values that have a **live** source. UNKNOWN stays unset. `BUZZ_AUTH_TAG` is S0 but lives on the `auth_tag` record field, **not** `env_vars` — do not paste it into Desktop env |

Webhook URLs (`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `ESCALATION_WEBHOOK_URL`)
are bearer credentials. S1, not addresses.

**Kimi GAP — closed, not to be built.** `KIMI_API_KEY` in `~/.kimi-code/config.toml` is
plaintext on the same disk, outside our control, with no wipe path. Worse, not better.
PMP and TUN fail over to grok/cursor subscription. No other agent fails *into* kimi.

**Home-runtime override:** `ANTHROPIC_API_KEY` on a Claude-home agent replaces Max and
swaps a ceilinged session for a long-lived unscoped bearer. Same class for `XAI_API_KEY`
on grok homes and `OPENAI_API_KEY` / `CODEX_API_KEY` on Codex homes. All stay **unset**.

S1 unblocks when MIA verifies the four §5 guards at a committed SHA. S3 needs that plus
a per-slot review. Peter or ICBM can overturn any row in #general / #command.

---

## 3. Failover order (ratified unchanged, kimi-in dropped)

Floor holds. No env + no smoked login → the task waits. A waiting task is a correct
outcome.

| Home runtime | Failover order (subscription login, no keys) |
|---|---|
| claude | grok → cursor → codex |
| grok | cursor → claude |
| codex | grok → claude |
| cursor | grok → claude |
| kimi | grok → cursor → claude |

kimi is **home only** (PMP, TUN). It is not a failover target.

---

## 4. S0 apply list — TIP types these, nothing else

`BUZZ_AGENT_OS_*` declarations are already in the live file. Do not retype them.

| Var | Value | Agent | Source | TIP |
|---|---|---|---|---|
| `PLAID_ENV` | **UNKNOWN** | PAT | GOMARCO-S4 *plans* sandbox after provision. Live MCP `plaid-finance` is `provisioned: false`. A ship-card intent is not a live env | **leave unset** |
| `BUZZ_RELAY_URL` | `wss://hvg.app` | JUV (declared). Harness already injects this for every agent | Live `BUZZ_RELAY_URL` this session; `WORK_LOGS/TIP_DESKTOP_CUT_2026-08-22.md` | Optional Desktop duplicate on JUV only. Do not spray onto 19 rows |
| `BUZZ_AUTH_TAG` | already on `auth_tag` field (22/41 records, 0 in `env_vars`) | JUV declared it in `REQUIRED_ENV` | MIA S1b — S0, not a bearer. Wrong slot for Desktop env | **do not type into env_vars** |
| `SHOPIFY_STORE_DOMAIN` | **UNKNOWN** | BSB | No provisioned `.myshopify.com` in nest or `hvgapp` as of 2026-08-22. THREE merch is IP-gated (`CARDS_SHIP_THREE.md`) | **leave unset** |
| `LIDAR_PIPELINE_URL` | **UNKNOWN** | SLM | MCP `lidar-spatial-data` `provisioned: false` (`config/agent-os/mcp-servers.config.json`) | **leave unset** |
| `PORTFOLIO_ANALYTICS_URL` | **UNKNOWN** | ICBM | MCP unprovisioned | **leave unset** |
| `CRISIS_NLP_URL` | **UNKNOWN** | NKI | MCP unprovisioned | **leave unset** |

UNKNOWN is not a value to type. A waiting S0 cell is correct until the MCP exists.

---

## 5. Per-agent rows

Home auth is the subscription login already on this machine. Failover env is **empty**.
MIA column is the Step 2 ruling: NO on every secret-shaped cell.

Expected home model is the live `managed-agents.json` `model` field, 2026-08-22.

| Agent | Home | Failover | Home auth | Secret-shaped env | S0 to type | MIA | Smoke |
|---|---|---|---|---|---|---|---|
| ICBM | claude / `claude-fable-5[1m]` | grok → cursor → codex | `/login` Max | **unset** (incl. `ANTHROPIC_API_KEY`, Stripe, cap table) | none (analytics URL UNKNOWN) | NO | |
| YAK | claude / `sonnet` | grok → cursor → codex | `/login` Max | **unset** | none | NO | |
| MFR | claude / `opus[1m]` | grok → cursor → codex | `/login` Max | **unset** (incl. `KUBECONFIG`, `DATABASE_URL`, `GITHUB_TOKEN`) | none | NO | |
| MIA | claude / `opus[1m]` | grok → cursor → codex | `/login` Max | **unset** | none | NO | |
| ROO | claude / `opus[1m]` | grok → cursor → codex | `/login` Max | **unset** (incl. `FIGMA_ACCESS_TOKEN`) | none | NO | |
| DEE | claude / (model unset in JSON) | grok → cursor → codex | `/login` Max | **unset** | none | NO | |
| PAT | grok / `grok-4.6` | cursor → claude | `grok login` → `~/.grok/auth.json` | **unset** (incl. `XAI_API_KEY`, Plaid/Duffel/Amadeus/Reach/Browserbase keys) | none (`PLAID_ENV` UNKNOWN until S4 provisions) | NO | **home PASS** — reported `grok-4.6`; SLM harness `grok-acp-pty` + `model=grok-4.6` @ 14:40Z |
| TIP | grok / `grok-4.6` | cursor → claude | `grok login` | **unset** (incl. GitHub/Railway/Vercel tokens) | none | NO | |
| VON | grok / `grok-4.6` | cursor → claude | `grok login` | **unset** | none | NO | |
| YBY | grok / `grok-4.6` | cursor → claude | `grok login` | **unset** | none | NO | |
| 3TH | grok / `grok-4.6` | cursor → claude | `grok login` | **unset** (incl. ASC / Play credentials) | none | NO | |
| BOO | grok / `grok-4.6` | cursor → claude | `grok login` | **unset**. `SERP_INTEL_API_KEY` is S1 — say so on the G-card; do not work around | none | NO | |
| LDA | grok / `grok-4.6` | cursor → claude | `grok login` | **unset** (creative-gen keys) | none | NO | |
| JUV | codex / `gpt-5.6-terra[high]` | grok → claude | `codex login` ChatGPT Pro | **unset**. `BUZZ_PRIVATE_KEY` must never take this path — keychain already ships | optional `BUZZ_RELAY_URL=wss://hvg.app` | NO | |
| BSB | codex / `gpt-5.6-terra[high]` | grok → claude | `codex login` | **unset** (Stripe/Shopify admin/Printful). Store domain UNKNOWN | none | NO | |
| SLM | cursor / `gpt-5.6-sol` | grok → claude | `agent login` | **unset** (LiDAR token). Pipeline URL UNKNOWN | none | NO | **home PASS** — SLM harness `cursor-agent acp` + `model=gpt-5.6-sol` @ 14:40Z |
| NKI | cursor / `gemini-3.7-flash` | grok → claude | `agent login` (Cursor-hosted Gemini, not `GEMINI_API_KEY`) | **unset** (crisis/Zendesk/webhook secrets). NLP URL UNKNOWN | none | NO | |
| PMP | kimi / `kimi-code/k3` | grok → cursor → claude | `/login` inside Kimi Code CLI | **unset**. No `config.toml` key task | none | NO | |
| TUN | kimi / `kimi-code/k3` | grok → cursor → claude | `/login` | **unset**. No `config.toml` key task | none | NO | |

No agent is assigned **goose** today.

Builtin duplicate records in `managed-agents.json` (empty `env_vars`, same display names)
are catalog templates, not hive agents. They are not in this table.

---

## 6. Smoke protocol (TIP Step 3, SLM Step 4)

Smoke is **"reply with your model name"** against **subscription logins only**.
No API-key runtime is in scope.

1. Home: one-turn ask on the agent's current runtime. Reported model must match the
   Home column (SLM verifies). PAT and SLM home rows are filled (2/19).
2. Failover: TIP switches the agent to the next runtime in the Failover column via
   Desktop (runtime dropdown, not env). Same one-turn ask. Switch back when done.
3. A row is not done until SLM pastes the reported model into the Smoke column.
4. If the subscription login is missing on that runtime, **the task waits**. Do not
   "fix" it with a key.

---

## 7. Official var names (reference only — none of these get a value)

Cited 2026-08-22. Kept so a future S1-unblocked pass does not reinvent names.

| Runtime | Home auth | Headless/API vars (S1 — do not type) | Source |
|---|---|---|---|
| claude | `/login` Max. `ANTHROPIC_API_KEY` unset | `ANTHROPIC_API_KEY`; optional `ANTHROPIC_MODEL` | [env-vars](https://code.claude.com/docs/en/env-vars.md); [support 12304248](https://support.claude.com/en/articles/12304248-managing-api-key-environment-variables-in-claude-code) |
| grok | `grok login` → `~/.grok/auth.json` | `XAI_API_KEY` | [docs.x.ai quickstart](https://docs.x.ai/developers/quickstart) |
| codex | `codex login` ChatGPT Pro | `CODEX_API_KEY` / `CODEX_ACCESS_TOKEN`; API-key mode `OPENAI_API_KEY` + `preferred_auth_method=apikey` | [learn.chatgpt.com env vars](https://learn.chatgpt.com/docs/config-file/environment-variables) |
| cursor | `agent login` | `CURSOR_API_KEY` | [cursor CLI auth](https://cursor.com/docs/cli/reference/authentication) |
| kimi | `/login` in Kimi Code CLI | `KIMI_API_KEY` lives in `config.toml`, not `process.env`. Closed as not to be built | [Kimi env-vars](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/env-vars.html) |
| goose | `goose configure` | provider key + `GOOSE_PROVIDER` / `GOOSE_MODEL` | [goose-docs.ai](https://goose-docs.ai/docs/guides/environment-variables/) |

---

## 8. Next

1. **TIP** — type **no** `PLAID_ENV` (retracted: MCP unprovisioned). Optional JUV
   `BUZZ_RELAY_URL=wss://hvg.app`. Do not paste `BUZZ_AUTH_TAG` into env. Then 17 remaining
   home smokes + failover smokes per §6.
2. **SLM** — Step 4: 2/19 home PASS (PAT, SLM). Remaining 17 WAIT on TIP smokes. Paste
   into the Smoke column; push after each stage.
3. **JUV** — `BUZZ_PRIVATE_KEY` in declared env is a **deletion**, not a migration
   (MIA 2026-08-22). Keychain already ships. `BUZZ_AUTH_TAG` is S0 and already on the
   `auth_tag` field — do not move it into env.
4. **BOO** — `SERP_INTEL_API_KEY` is S1. State that on the G-card.
5. Task 6 **does not close** until SLM has home smokes for all 19. Failover smokes that
   cannot run because a subscription login is missing wait — they do not get a key.
