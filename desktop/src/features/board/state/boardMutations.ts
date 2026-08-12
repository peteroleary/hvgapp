import { useMutation, useQueryClient } from "@tanstack/react-query";

import { relayClient } from "@/shared/api/relayClient";
import { signRelayEvent } from "@/shared/api/tauri";
import type { RelayEvent } from "@/shared/api/types";

import type {
  ApprovalDecision,
  AutonomyPolicy,
  Board,
  Card,
  FeedRule,
  Goal,
} from "../types/boardTypes";
import {
  buildApprovalDecisionEventTemplate,
  buildApprovalRequestEventTemplate,
  buildAutonomyPolicyEventTemplate,
  buildBoardEventTemplate,
  buildCardEventTemplate,
  buildFeedRuleEventTemplate,
  buildGoalEventTemplate,
  type BoardEventTemplate,
  type BoardState,
} from "./boardEvents";
import { boardQueryKey } from "./useBoardStore";

export type BoardCardInput = {
  boardAddress: string;
  card: Card;
};

export type UpdateCardInput = {
  boardAddress: string;
  cardId: string;
  changes: Partial<Card>;
};

export type MoveCardInput = {
  boardAddress: string;
  cardId: string;
  listId: string;
  rank: string;
};

/** Signs and publishes one Board event while preserving the shared error UX. */
export async function publishBoardEvent(
  template: BoardEventTemplate,
): Promise<RelayEvent> {
  const event = await signRelayEvent(template);
  return relayClient.publishEvent(
    event,
    "Timed out publishing Board changes.",
    "Failed to publish Board changes.",
  );
}

/** Creates or replaces one addressable Board. */
export function publishBoard(board: Board): Promise<RelayEvent> {
  return publishBoardEvent(buildBoardEventTemplate(board));
}

/** Creates or replaces one addressable Board card. */
export function createCard(input: BoardCardInput): Promise<RelayEvent> {
  return publishBoardEvent(buildCardEventTemplate(input));
}

/**
 * Replaces a Board card, applying the supplied changes to the reconciled
 * snapshot head rather than to caller-supplied state. This prevents a stale
 * caller from silently overwriting fields it did not know changed.
 */
export function updateCard(
  input: UpdateCardInput,
  getCurrentCard: (cardId: string) => Card | undefined,
): Promise<RelayEvent> {
  const current = getCurrentCard(input.cardId);
  if (!current) {
    throw new Error(`Card ${input.cardId} not found in current board state.`);
  }
  return createCard({
    boardAddress: input.boardAddress,
    card: { ...current, ...input.changes },
  });
}

/**
 * Moves a card by publishing its new list/rank against the reconciled snapshot
 * head. Like updateCard, this never builds from caller-supplied card state.
 */
export function moveCard(
  input: MoveCardInput,
  getCurrentCard: (cardId: string) => Card | undefined,
): Promise<RelayEvent> {
  return updateCard(
    {
      boardAddress: input.boardAddress,
      cardId: input.cardId,
      changes: { listId: input.listId, rank: input.rank },
    },
    getCurrentCard,
  );
}

/** Publishes the append-only event which begins an approval gate. */
export function requestApproval({
  cardAddress,
  approvers,
}: {
  cardAddress: string;
  approvers: readonly string[];
}): Promise<RelayEvent> {
  return publishBoardEvent(
    buildApprovalRequestEventTemplate({ cardAddress, approvers }),
  );
}

/** Publishes an append-only human approval or rejection record. */
export function recordApprovalDecision({
  cardAddress,
  decision,
}: {
  cardAddress: string;
  decision: ApprovalDecision;
}): Promise<RelayEvent> {
  return publishBoardEvent(
    buildApprovalDecisionEventTemplate({ cardAddress, decision }),
  );
}

export function publishGoal(goal: Goal): Promise<RelayEvent> {
  return publishBoardEvent(buildGoalEventTemplate(goal));
}

export function publishFeedRule(rule: FeedRule): Promise<RelayEvent> {
  return publishBoardEvent(buildFeedRuleEventTemplate(rule));
}

export function publishAutonomyPolicy(
  policy: AutonomyPolicy,
): Promise<RelayEvent> {
  return publishBoardEvent(buildAutonomyPolicyEventTemplate(policy));
}

/**
 * Board write hooks. Every successful mutation invalidates the one shared
 * read model so presentation components never manage relay state themselves.
 */
export function useBoardMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: boardQueryKey });
  const options = { onSuccess: invalidate };

  const getCurrentCard = (cardId: string): Card | undefined => {
    const state = queryClient.getQueryData<BoardState>(boardQueryKey);
    return state?.cards.find((entity) => entity.card.id === cardId)?.card;
  };

  return {
    publishBoard: useMutation({ mutationFn: publishBoard, ...options }),
    createCard: useMutation({ mutationFn: createCard, ...options }),
    updateCard: useMutation({
      mutationFn: (input: UpdateCardInput) => updateCard(input, getCurrentCard),
      ...options,
    }),
    moveCard: useMutation({
      mutationFn: (input: MoveCardInput) => moveCard(input, getCurrentCard),
      ...options,
    }),
    requestApproval: useMutation({ mutationFn: requestApproval, ...options }),
    recordApprovalDecision: useMutation({
      mutationFn: recordApprovalDecision,
      ...options,
    }),
    publishGoal: useMutation({ mutationFn: publishGoal, ...options }),
    publishFeedRule: useMutation({ mutationFn: publishFeedRule, ...options }),
    publishAutonomyPolicy: useMutation({
      mutationFn: publishAutonomyPolicy,
      ...options,
    }),
  };
}
