import type { Goal } from "../types/boardTypes";

export interface CreateGoalInput {
  id: string;
  brandScope: string;
  specific: string;
  measurable?: string;
  attainable?: string;
  relevant?: string;
  timeBound?: string;
}

/**
 * Operator-created Board goal. Empty SMART slots stay empty — nothing is
 * fabricated to make the form look complete. Status is `approved` so the
 * Goals tab records a set goal, not a Comet proposal waiting for review.
 */
export function buildCreatedGoal(input: CreateGoalInput): Goal {
  const specific = input.specific.trim();
  const brandScope = input.brandScope.trim();
  if (!specific) {
    throw new Error("Goal specific is required.");
  }
  if (!brandScope) {
    throw new Error("Goal brandScope is required.");
  }
  return {
    id: input.id,
    brandScope,
    framework: "SMART",
    smart: {
      specific,
      measurable: input.measurable?.trim() ?? "",
      attainable: input.attainable?.trim() ?? "",
      relevant: input.relevant?.trim() ?? "",
      timeBound: input.timeBound?.trim() ?? "",
    },
    status: "approved",
    proposedCards: [],
  };
}
