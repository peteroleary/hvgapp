/**
 * Buzz Agent OS — the authoritative, source-controlled specification of the
 * 14-agent workforce, their MCP/skill bindings, and the cross-agent workflow
 * state machines that coordinate them across hvg.app and the five consumer
 * brands.
 *
 * See `config/agent-os/README.md` for how this layer relates to the desktop
 * persona store and to the executable `.mcp.json`.
 */
export * from "./types.ts";
export * from "./brands.ts";
export * from "./models.ts";
export * from "./mcpRegistry.ts";
export * from "./agents/index.ts";
export * from "./workflows/index.ts";
export * from "./validate.ts";
export * from "./project.ts";
