export type AutonomyLevel = 'manual' | 'notify' | 'auto';

export type CardExecutionState =
  | 'idle'
  | 'eligible'
  | 'running'
  | 'completed'
  | 'blocked'
  | 'needs_approval';

export interface Assignee {
  type: 'agent' | 'human';
  id: string; // pubkey or agent name
  role?: 'lead' | 'reviewer' | 'executor';
}

export interface Card {
  id: string;
  title: string;
  description: string;
  brand: 'HVG' | 'MoSober' | 'Clean Startup' | 'We3Live' | 'K&B' | 'hvg.app' | string;
  functionArea: 'build' | 'design' | 'content' | 'social' | 'marketing' | 'sales' | 'research' | 'other';
  assignees: Assignee[];
  executionState: CardExecutionState;
  rank: string; // Fractional index string
  listId: string;
  boardId: string;
  linkedGitIssue?: string;
  createdBy: string;
  feedForwardContext?: Record<string, any>;
  comments: Array<{
    id: string;
    authorId: string;
    body: string;
    createdAt: string;
  }>;
  parentGoalId?: string;
  sourceLineage?: {
    fromBoardId: string;
    fromBoardTitle: string;
    ruleAction: 'move' | 'copy' | 'spawn-linked-card';
  };
  approvalDecision?: {
    state: 'approved' | 'rejected';
    by?: string;
    at?: string;
    reason?: string;
    policySnapshot?: AutonomyLevel;
  };
}

export interface Goal {
  id: string;
  brandScope: string;
  framework: 'SMART' | 'OKR' | 'PACT';
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
  status: 'draft' | 'proposed' | 'approved' | 'executing' | 'completed';
  proposedCards: Array<{
    cardDraft: Partial<Card>;
    suggestedAssignee: string;
  }>;
}

export interface BoardList {
  id: string;
  title: string;
  rank: string; // Fractional index string
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  brandScope?: string;
  lists: BoardList[];
}

export interface AutonomyPolicy {
  agentId: string;
  functionArea: string;
  autonomyLevel: AutonomyLevel;
}

export interface FeedRule {
  id: string;
  sourceBoardId: string;
  sourceListId: string;
  targetBoardId: string;
  targetListId: string;
  action: 'move' | 'copy' | 'spawn-linked-card';
  enabled: boolean;
  broken?: {
    reason: 'target_list_missing' | 'target_board_missing';
    detail?: string;
    detectedAt: string;
  };
}

export function evaluateAutonomy(
  card: Card,
  policies: AutonomyPolicy[]
): boolean {
  if (card.approvalDecision?.state === 'approved') {
    return false;
  }
  if (card.approvalDecision?.state === 'rejected') {
    return true;
  }

  if (card.assignees.length === 0) {
    return true;
  }

  const agentAssignees = card.assignees.filter(a => a.type === 'agent');

  if (agentAssignees.length === 0) {
    return false;
  }

  for (const agent of agentAssignees) {
    const policy = policies.find(
      p => p.agentId === agent.id && p.functionArea === card.functionArea
    );
    const level = policy?.autonomyLevel || 'manual';
    if (level === 'manual') {
      return true;
    }
  }

  return false;
}
