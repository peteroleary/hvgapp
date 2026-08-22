# WORK ORDER — PONYTAIL + HEADROOM ON EVERY RUNTIME

**Mandated by Peter, 2026-08-21. Owner: TIP. Clearance: MIA (sees-traffic + hooks). Adapter
verification: PAT.** This mandate skips the blocked-card gate — start immediately.

Source of truth for the matrix: [`TOOL_PARITY.md`](./TOOL_PARITY.md) §4 and §5. Do not
re-derive; PAT verifies only what is marked unverified there.

| Step | Owner | Action | Done when |
|---|---|---|---|
| 1 | TIP | `uv tool install --python 3.13 "headroom-ai[all]"` (needs python 3.13; `uv` already on PATH) | `headroom --version` runs |
| 2 | TIP | Set `HEADROOM_OUTPUT_SHAPER=1` **before first wrap** — that is the terse-output switch | env persisted in each runtime's launch config |
| 3 | TIP | Interactive runtimes: `headroom wrap claude|grok|codex|kimi|goose`. Cursor: `headroom proxy --port 8787` + manual base-URL in Cursor settings | each wrapped session shows compressed context |
| 4 | TIP | Harness-spawned headless agents don't run `wrap` — point each runtime's model base-URL env at the local proxy in `managed-agents.json` instead. PAT supplies the per-runtime env var names | a headless agent's traffic visibly transits the proxy |
| 5 | TIP | ponytail: claude `/plugin marketplace add DietrichGebert/ponytail` → `/plugin install ponytail@ponytail`; grok `grok plugin install DietrichGebert/ponytail --trust` + enable in `~/.grok/config.toml`; codex `codex plugin marketplace add …` → `codex plugin add ponytail@ponytail`, trust the two hooks via `/hooks`; cursor: copy `.cursor/rules/ponytail.md` from a checkout | adapter loads in each runtime |
| 6 | PAT | Verify the two unverified adapters: kimi (candidate: `~/.agents/skills/ponytail/`), goose (candidate: `~/.config/goose/skills/ponytail/`). Report exact working path per runtime | both report INSTALLED or a concrete blocker |
| 7 | TIP | caveman (terse-prose skill, ships in the ponytail repo): `npx skills add DietrichGebert/ponytail --skill caveman -g` | skill present for all runtimes that load that tree |
| 8 | MIA | Clearance pass: ponytail runs third-party Node hooks per prompt; headroom sees 100% of LLM traffic incl. bearer forwarding. Cleared or blocked in writing | clearance recorded on the card |

**One proxy caveat:** on a shared headroom proxy the last shaper setting wins fleet-wide —
run one proxy per runtime, or accept shared settings (TOOL_PARITY §4).

**RAM note (Peter, 2026-08-22):** three kickoff prompts at once overloaded the Mac. Do NOT
wrap/launch all six runtimes in one pass — bring them up one at a time and confirm memory
headroom between each.
