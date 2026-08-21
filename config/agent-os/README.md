# Buzz Agent OS (`@buzz/agent-os`)

The authoritative, source-controlled specification of the 14-agent workforce:
identity, mandate, system prompt, tool/MCP/skill bindings, routing, and the
cross-agent workflow state machines that coordinate them across `hvg.app` and
the five consumer brands.

## Why this is a separate layer

The desktop app already has a persona system — `AgentDefinition` in
`desktop/src-tauri/src/managed_agents/types.rs`, persisted to app data and
merged at runtime. That record has no fields for `moniker`, `artistPersona`,
`coreMandate`, `tools`, `mcpServers`, `skills`, or `routingRules`, and its
directory-backed team format is actively being migrated away
(`detach_directory_backed_teams_in_dir`).

So this package is **additive**: it is the spec, not the store. Nothing here
mutates the live persona records. `toAgentDefinition()` in `src/project.ts`
narrows a config down to the subset the store actually carries, for seeding.

## Layout

| Path | Contents |
|------|----------|
| `src/types.ts` | Core type surface — `AgentConfig`, `McpServerSpec`, `RoutingRules` |
| `src/brands.ts` | The platform (`hvgapp`) and five consumer brands |
| `src/models.ts` | Opaque model identifier constants |
| `src/mcpRegistry.ts` | Declarative MCP + skill-pack registry (source of truth) |
| `src/agents/` | One file per agent, 14 total |
| `src/workflows/` | Five typed state machines plus the transition runtime |
| `src/validate.ts` | Referential-integrity and guardrail audit |
| `src/project.ts` | Projection down to the desktop persona seed shape |
| `mcp-servers.config.json` | **Generated** from `mcpRegistry.ts` — do not hand-edit |

## The MCP registry is not `.mcp.json`

`mcp-servers.config.json` is a *declarative* registry: it records endpoints,
permissions, tool bindings, and required env for every server the agents bind
to. It is deliberately **not** the executable `.mcp.json` at the repo root,
which Claude Code reads at startup — registering unprovisioned servers there
would break the live MCP session.

Most entries carry `provisioned: false` and a `null` endpoint. Promoting an
entry to `provisioned: true` with a real endpoint is what gates wiring it into
`.mcp.json`. A test enforces that unprovisioned servers declare no endpoint.

Secrets never live here. `requiredEnv` names the variables; values belong in
the host environment.

## Brand nomenclature

Slugs are the query-safe key, stamped into `card.brand`, `board.brandScope`,
and the relay-indexed `brand:<slug>` tag. `src/brands.ts` and
`desktop/src/features/board/ui/brandTokens.ts` must agree on the slug set;
both are pinned by tests.

`hvgapp` is the Buzz operating platform. `itshvg` ("High Value Growth") is
the consumer media brand. They are separate entities and must never be
conflated.

## Commands

```bash
pnpm --filter @buzz/agent-os check         # biome + tsc --noEmit + tests
pnpm --filter @buzz/agent-os generate:mcp  # regenerate mcp-servers.config.json
```

`pnpm check` fails if the committed JSON is stale relative to the registry.
