import type { Goal } from "../types/boardTypes";

/** Fields the Desktop goal composer collects before a Goal is assembled. */
export interface GoalDraft {
  brandScope: string;
  framework: Goal["framework"];
  status?: Goal["status"];
  specific?: string;
  measurable?: string;
  attainable?: string;
  relevant?: string;
  timeBound?: string;
  objective?: string;
  keyResultDescription?: string;
  keyResultMetric?: string;
  purposeful?: string;
  actionable?: string;
  continuous?: string;
  trackable?: string;
}

function required(value: string | undefined, label: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

/**
 * Builds a kind:30625 Goal from composer fields. Empty proposedCards is
 * deliberate: Desktop compose creates the goal; card attachment is a
 * separate write on the card (`parentGoalId`).
 */
export function assembleGoal(id: string, draft: GoalDraft): Goal {
  const goalId = required(id, "Goal id");
  const brandScope = required(draft.brandScope, "Brand scope");
  const status = draft.status ?? "draft";
  const base = {
    id: goalId,
    brandScope,
    status,
    proposedCards: [] as Goal["proposedCards"],
  };

  if (draft.framework === "SMART") {
    return {
      ...base,
      framework: "SMART",
      smart: {
        specific: required(draft.specific, "SMART specific"),
        measurable: required(draft.measurable, "SMART measurable"),
        attainable: required(draft.attainable, "SMART attainable"),
        relevant: required(draft.relevant, "SMART relevant"),
        timeBound: required(draft.timeBound, "SMART time-bound"),
      },
    };
  }

  if (draft.framework === "OKR") {
    const description = draft.keyResultDescription?.trim() ?? "";
    const targetMetric = draft.keyResultMetric?.trim() ?? "";
    if (!description || !targetMetric) {
      throw new Error("OKR key result description and metric are required.");
    }
    return {
      ...base,
      framework: "OKR",
      okr: {
        objective: required(draft.objective, "OKR objective"),
        keyResults: [{ description, targetMetric }],
      },
    };
  }

  if (draft.framework === "PACT") {
    return {
      ...base,
      framework: "PACT",
      pact: {
        purposeful: required(draft.purposeful, "PACT purposeful"),
        actionable: required(draft.actionable, "PACT actionable"),
        continuous: required(draft.continuous, "PACT continuous"),
        trackable: required(draft.trackable, "PACT trackable"),
      },
    };
  }

  throw new Error("Unknown goal framework.");
}

/** One-line label for a goal in pickers and lists. */
export function goalHeadline(goal: Goal): string {
  if (goal.framework === "SMART" && goal.smart?.specific.trim()) {
    return goal.smart.specific.trim();
  }
  if (goal.framework === "OKR" && goal.okr?.objective.trim()) {
    return goal.okr.objective.trim();
  }
  if (goal.framework === "PACT" && goal.pact?.purposeful.trim()) {
    return goal.pact.purposeful.trim();
  }
  return goal.id;
}
