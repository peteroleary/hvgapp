import { getIdentity } from "@/shared/api/tauriIdentity";

import { BoardView } from "./BoardView";
import { useBoardMutations } from "./state/boardMutations";
import { useBoardLiveUpdates, useBoardStateQuery } from "./state/useBoardStore";

/** The routed Board surface backed by the shared Board relay read model. */
export function BoardScreen() {
  useBoardLiveUpdates();
  const boardQuery = useBoardStateQuery();
  const mutations = useBoardMutations();

  if (boardQuery.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading Board…</div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="p-6 text-sm text-destructive">
        Could not load Board. {boardQuery.error.message}
      </div>
    );
  }

  const state = boardQuery.data;
  const boardEntity = state?.boards[0];
  if (!state || !boardEntity) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Board</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No Board has been published to this community yet.
          </p>
        </div>
      </div>
    );
  }

  const findCard = (cardId: string) =>
    state.cards.find((entity) => entity.card.id === cardId);
  const findGoal = (goalId: string) =>
    state.goals.find((entity) => entity.goal.id === goalId);

  return (
    <BoardView
      autonomyPolicies={state.autonomyPolicies.map((entity) => entity.policy)}
      board={boardEntity.board}
      cards={state.cards
        .filter((entity) => entity.boardAddress === boardEntity.address)
        .map((entity) => entity.card)}
      feedRules={state.feedRules
        .map((entity) => entity.rule)
        .filter(
          (rule) =>
            rule.sourceBoardId === boardEntity.board.id ||
            rule.targetBoardId === boardEntity.board.id,
        )}
      goals={state.goals.map((entity) => entity.goal)}
      onApproveCard={(cardId) => {
        const entity = findCard(cardId);
        if (!entity) return;
        mutations.recordApprovalDecision.mutate({
          cardAddress: entity.address,
          decision: { state: "approved" },
        });
      }}
      onRejectCard={(cardId, reason) => {
        const entity = findCard(cardId);
        if (!entity) return;
        mutations.recordApprovalDecision.mutate({
          cardAddress: entity.address,
          decision: { state: "rejected", reason },
        });
      }}
      onAddComment={(cardId, commentBody) => {
        const entity = findCard(cardId);
        if (!entity) return;
        void getIdentity().then((identity) => {
          mutations.updateCard.mutate({
            boardAddress: entity.boardAddress,
            card: {
              ...entity.card,
              comments: [
                ...entity.card.comments,
                {
                  id: crypto.randomUUID(),
                  authorId: identity.pubkey,
                  body: commentBody,
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          });
        });
      }}
      onApproveGoal={(goalId) => {
        const entity = findGoal(goalId);
        if (!entity) return;
        mutations.publishGoal.mutate({ ...entity.goal, status: "approved" });
      }}
      onRejectGoal={(goalId) => {
        const entity = findGoal(goalId);
        if (!entity) return;
        // The goal status vocabulary has no "rejected": a declined proposal
        // returns to draft so it can be revised and re-proposed.
        mutations.publishGoal.mutate({ ...entity.goal, status: "draft" });
      }}
    />
  );
}
