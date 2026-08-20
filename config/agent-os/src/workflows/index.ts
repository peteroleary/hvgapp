import { CLEAN_INGESTION } from "./cleanIngestion.ts";
import { HVG_REVIEW } from "./hvgReview.ts";
import { LHFYC_ESCROW } from "./lhfycEscrow.ts";
import { PLATFORM_BUILD } from "./platformBuild.ts";
import type {
  TransitionEvent,
  WorkflowDefinition,
  WorkflowId,
  WorkflowState,
} from "./types.ts";
import { WE3LIVE_PRODUCTION } from "./we3liveProduction.ts";

export * from "./types.ts";
export {
  CLEAN_INGESTION,
  HVG_REVIEW,
  LHFYC_ESCROW,
  PLATFORM_BUILD,
  WE3LIVE_PRODUCTION,
};

/** All five orchestrated workflows. */
export const WORKFLOWS: readonly WorkflowDefinition[] = [
  PLATFORM_BUILD,
  WE3LIVE_PRODUCTION,
  CLEAN_INGESTION,
  LHFYC_ESCROW,
  HVG_REVIEW,
];

const BY_ID = new Map<WorkflowId, WorkflowDefinition>(
  WORKFLOWS.map((workflow) => [workflow.id, workflow]),
);

/** Look up a workflow by id. */
export function getWorkflow(id: WorkflowId): WorkflowDefinition {
  const workflow = BY_ID.get(id);
  if (!workflow) throw new Error(`Unknown workflow id: ${id}`);
  return workflow;
}

/** Look up a state within a workflow. */
export function getState(
  workflow: WorkflowDefinition,
  stateId: string,
): WorkflowState {
  const state = workflow.states.find((candidate) => candidate.id === stateId);
  if (!state) {
    throw new Error(`Unknown state "${stateId}" in workflow "${workflow.id}"`);
  }
  return state;
}

/**
 * Resolve the state a run moves to when `event` fires from `stateId`.
 * Returns `null` when the event is not a legal transition from that state —
 * callers decide whether that is a no-op or an error.
 */
export function nextState(
  workflow: WorkflowDefinition,
  stateId: string,
  event: TransitionEvent,
): WorkflowState | null {
  const target = getState(workflow, stateId).on[event];
  return target === undefined ? null : getState(workflow, target);
}

/** Events that are legal from the given state. */
export function legalEvents(
  workflow: WorkflowDefinition,
  stateId: string,
): readonly TransitionEvent[] {
  return Object.keys(getState(workflow, stateId).on) as TransitionEvent[];
}
