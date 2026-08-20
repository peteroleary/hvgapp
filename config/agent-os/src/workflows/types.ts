import type { AgentId, ScopeSlug } from "../types.ts";

/** The five orchestrated cross-agent workflows. */
export type WorkflowId =
  | "platform-build"
  | "we3live-production"
  | "clean-ingestion"
  | "lhfyc-escrow"
  | "hvg-review";

/**
 * Events that move a workflow between states.
 *
 * `advance` is the happy path. `reject` sends work back for rework.
 * `escalate` routes to a supervising agent. `crisis` is a safety interrupt
 * that jumps straight to human paging, bypassing the normal path. `block`
 * parks the run until an external dependency clears.
 */
export type TransitionEvent =
  | "advance"
  | "reject"
  | "escalate"
  | "crisis"
  | "block";

/** Who is responsible for a state while the run sits in it. */
export type StateOwner =
  | {
      readonly kind: "agents";
      readonly agents: readonly AgentId[];
      /** True when the listed agents work the state simultaneously. */
      readonly concurrent: boolean;
    }
  | { readonly kind: "human"; readonly who: "peter" }
  | { readonly kind: "system"; readonly source: string };

/** One node in a workflow state machine. */
export interface WorkflowState {
  readonly id: string;
  readonly name: string;
  readonly owner: StateOwner;
  readonly description: string;
  /** Event → target state id. A state with no outgoing edges must be terminal. */
  readonly on: Readonly<Partial<Record<TransitionEvent, string>>>;
  readonly terminal: boolean;
}

/** A complete, typed workflow state machine. */
export interface WorkflowDefinition {
  readonly id: WorkflowId;
  readonly name: string;
  readonly scope: ScopeSlug;
  readonly description: string;
  /** Id of the starting state. Must exist in `states`. */
  readonly initial: string;
  readonly states: readonly WorkflowState[];
}

/** Convenience constructor for an agent-owned state. */
export function ownedBy(
  ...agents: readonly AgentId[]
): Extract<StateOwner, { kind: "agents" }> {
  return { kind: "agents", agents, concurrent: agents.length > 1 };
}

/** Convenience constructor for a state owned by Peter. */
export const OWNED_BY_PETER: StateOwner = { kind: "human", who: "peter" };

/** Convenience constructor for a system/pipeline-owned state. */
export function ownedBySystem(source: string): StateOwner {
  return { kind: "system", source };
}
