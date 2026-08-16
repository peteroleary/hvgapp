import { useState } from "react";

import { getIdentity } from "@/shared/api/tauriIdentity";

import { BoardView } from "./BoardView";
import { useBoardMutations } from "./state/boardMutations";
import { compareRank, rankBetween } from "./state/rank";
import { useBoardLiveUpdates, useBoardStateQuery } from "./state/useBoardStore";
import type { BoardList } from "./types/boardTypes";
import { BoardCreateModal, type BoardDraft } from "./ui/BoardCreateModal";
import type { CardDraft } from "./ui/CardComposerModal";
import { DEFAULT_LIST_TITLES } from "./ui/boardListDefaults";

function buildDefaultLists(): BoardList[] {
  let rank: string | null = null;
  return DEFAULT_LIST_TITLES.map((title) => {
    rank = rankBetween(rank, null);
    return { id: crypto.randomUUID(), title, rank };
  });
}

/** The routed Board surface backed by the shared Board relay read model. */
export function BoardScreen() {
  useBoardLiveUpdates();
  const boardQuery = useBoardStateQuery();
  const mutations = useBoardMutations();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  const createBoard = (draft: BoardDraft) => {
    const id = crypto.randomUUID();
    // Select the new board right away; the view falls back to the first
    // board until the published head arrives over the live subscription.
    setSelectedBoardId(id);
    mutations.publishBoard.mutate({
      id,
      title: draft.title,
      description: draft.description,
      brandScope: draft.brandScope,
      lists: buildDefaultLists(),
    });
  };

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
  const boardEntity =
    state?.boards.find((entity) => entity.board.id === selectedBoardId) ??
    state?.boards[0];
  if (!state || !boardEntity) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Board</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No Board has been published to this community yet.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateBoardOpen(true)}
            className="mt-4 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold hover:bg-primary/90 transition-colors"
          >
            + New Board
          </button>
          <BoardCreateModal
            isOpen={isCreateBoardOpen}
            onClose={() => setIsCreateBoardOpen(false)}
            onCreateBoard={createBoard}
          />
        </div>
      </div>
    );
  }

  const findCard = (cardId: string) =>
    state.cards.find((entity) => entity.card.id === cardId);
  const findGoal = (goalId: string) =>
    state.goals.find((entity) => entity.goal.id === goalId);

  const addCard = (listId: string, draft: CardDraft) => {
    const columnCards = state.cards
      .filter(
        (entity) =>
          entity.boardAddress === boardEntity.address &&
          entity.card.listId === listId,
      )
      .sort((left, right) =>
        compareRank(
          { rank: left.card.rank, createdAt: left.createdAt, id: left.card.id },
          {
            rank: right.card.rank,
            createdAt: right.createdAt,
            id: right.card.id,
          },
        ),
      );
    const last = columnCards[columnCards.length - 1];
    void getIdentity().then((identity) => {
      mutations.createCard.mutate({
        boardAddress: boardEntity.address,
        card: {
          id: crypto.randomUUID(),
          title: draft.title,
          description: draft.description,
          brand: draft.brand,
          functionArea: draft.functionArea,
          assignees: [],
          executionState: "idle",
          rank: rankBetween(last?.card.rank ?? null, null),
          listId,
          boardId: boardEntity.board.id,
          createdBy: identity.pubkey,
          comments: [],
        },
      });
    });
  };

  return (
    <>
      <BoardView
        approvalPendingByCardId={state.approvalPendingByCardId}
        board={boardEntity.board}
        boards={state.boards.map((entity) => ({
          id: entity.board.id,
          title: entity.board.title,
        }))}
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
        onSelectBoard={setSelectedBoardId}
        onNewBoard={() => setIsCreateBoardOpen(true)}
        onAddCard={addCard}
        onMoveCard={({ cardId, listId, rank }) => {
          mutations.moveCard.mutate({
            boardAddress: boardEntity.address,
            cardId,
            listId,
            rank,
          });
        }}
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
              cardId: entity.card.id,
              changes: {
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
      <BoardCreateModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreateBoard={createBoard}
      />
    </>
  );
}
