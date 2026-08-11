/** The autonomy tier assigned to an agent for a functional area. */
export type AutonomyLevel = "manual" | "notify" | "auto";

/** The operational lifecycle represented on a Board card. */
export type CardExecutionState =
  | "idle"
  | "eligible"
  | "running"
  | "completed"
  | "blocked"
  | "needs_approval";

/** The Board-wide function taxonomy used by filtering and autonomy policies. */
export type FunctionArea =
  | "build"
  | "design"
  | "content"
  | "social"
  | "marketing"
  | "sales"
  | "research"
  | "other";

/** An accountable human or agent attached to a card. */
export interface Assignee {
  type: "agent" | "human";
  id: string;
  role?: "lead" | "reviewer" | "executor";
}

/** A replaceable Board column embedded in its parent Board event. */
export interface BoardList {
  id: string;
  title: string;
  rank: string;
}

/** A top-level cross-brand operational Board. */
export interface Board {
  id: string;
  title: string;
  description?: string;
  brandScope?: string;
  lists: BoardList[];
}

/** An immutable human decision attached to a card's approval history. */
export interface ApprovalDecision {
  state: "approved" | "rejected";
  by?: string;
  at?: string;
  reason?: string;
  policySnapshot?: AutonomyLevel;
}

/** Provenance stamped on cards created by a feed-rule effect. */
export interface CardSourceLineage {
  fromBoardId: string;
  fromBoardTitle: string;
  ruleAction: "move" | "copy" | "spawn-linked-card";
  ruleId?: string;
  triggerEventId?: string;
}

/** A unit of work in a Board list. */
export interface Card {
  id: string;
  title: string;
  description: string;
  brand: string;
  functionArea: FunctionArea;
  assignees: Assignee[];
  executionState: CardExecutionState;
  rank: string;
  listId: string;
  boardId: string;
  linkedGitIssue?: string;
  createdBy: string;
  feedForwardContext?: Record<string, unknown>;
  comments: Array<{
    id: string;
    authorId: string;
    body: string;
    createdAt: string;
  }>;
  parentGoalId?: string;
  sourceLineage?: CardSourceLineage;
  approvalDecision?: ApprovalDecision;
}

/** A structured outcome which Comet can decompose into proposed cards. */
export interface Goal {
  id: string;
  brandScope: string;
  framework: "SMART" | "OKR" | "PACT";
  smart?: {
    specific: string;
    measurable: string;
    attainable: string;
    relevant: string;
    timeBound: string;
  };
  okr?: {
    objective: string;
    keyResults: Array<{
      description: string;
      targetMetric: string;
      currentValue?: string;
      targetValue?: string;
    }>;
  };
  pact?: {
    purposeful: string;
    actionable: string;
    continuous: string;
    trackable: string;
  };
  status: "draft" | "proposed" | "approved" | "executing" | "completed";
  proposedCards: Array<{
    cardDraft: Partial<Card>;
    suggestedAssignee: string;
  }>;
}

/** The autonomy policy evaluated for each agent assignee at execution time. */
export interface AutonomyPolicy {
  agentId: string;
  functionArea: FunctionArea;
  autonomyLevel: AutonomyLevel;
}

/** Cross-Board automation that fires when a card enters a source list. */
export interface FeedRule {
  id: string;
  sourceBoardId: string;
  sourceListId: string;
  targetBoardId: string;
  targetListId: string;
  action: "move" | "copy" | "spawn-linked-card";
  enabled: boolean;
  broken?: {
    reason: "target_board_missing" | "target_list_missing";
    detail?: string;
    detectedAt: string;
  };
}

/** Returns whether the card must be approved before it can be actioned. */
export function evaluateAutonomy(
  card: Card,
  policies: readonly AutonomyPolicy[],
): boolean {
  if (card.approvalDecision?.state === "approved") return false;
  if (card.approvalDecision?.state === "rejected") return true;
  if (card.assignees.length === 0) return true;

  const agentAssignees = card.assignees.filter(
    (assignee) => assignee.type === "agent",
  );
  if (agentAssignees.length === 0) return false;

  return agentAssignees.some(
    (assignee) =>
      policies.find(
        (policy) =>
          policy.agentId === assignee.id &&
          policy.functionArea === card.functionArea,
      )?.autonomyLevel !== "auto",
  );
}
