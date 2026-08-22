import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type React from "react";
import { useState } from "react";

import type { UserProfileLookup } from "@/features/profile/lib/identity";

import { resolveDropRank } from "./state/dropRank";
import { compareRank } from "./state/rank";
import type { Board, Card, FeedRule, Goal } from "./types/boardTypes";
import { BoardCardModal } from "./ui/BoardCardModal";
import { BoardColumn } from "./ui/BoardColumn";
import { BoardFeedRulesModal } from "./ui/BoardFeedRulesModal";
import { CardComposerModal, type CardDraft } from "./ui/CardComposerModal";
import { GoalDraftPanel } from "./ui/GoalDraftPanel";

export interface BoardViewProps {
  board: Board;
  boards?: Array<{ id: string; title: string }>;
  cards: Card[];
  goals?: Goal[];
  approvalPendingByCardId?: Readonly<Record<string, boolean>>;
  feedRules?: FeedRule[];
  /** Resolved kind:0 profiles for this board's assignees. */
  profiles?: UserProfileLookup;
  onSelectBoard?: (boardId: string) => void;
  onNewBoard?: () => void;
  onAddCard?: (listId: string, draft: CardDraft) => void;
  onMoveCard?: (input: {
    cardId: string;
    listId: string;
    rank: string;
  }) => void;
  onApproveCard?: (cardId: string) => void;
  onRejectCard?: (cardId: string, reason: string) => void;
  onAddComment?: (cardId: string, commentBody: string) => void;
  onApproveGoal?: (goalId: string) => void;
  onRejectGoal?: (goalId: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  board,
  boards = [],
  cards,
  goals = [],
  approvalPendingByCardId = {},
  feedRules = [],
  profiles,
  onSelectBoard,
  onNewBoard,
  onAddCard,
  onMoveCard,
  onApproveCard,
  onRejectCard,
  onAddComment,
  onApproveGoal,
  onRejectGoal,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const selectedRequiresApproval = selectedCard
    ? (approvalPendingByCardId[selectedCard.id] ?? false)
    : false;
  const [isFeedRulesOpen, setIsFeedRulesOpen] = useState(false);
  const [composerListId, setComposerListId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"columns" | "goals" | "feedRules">(
    "columns",
  );

  const pendingGoals = goals.filter((g) => g.status === "proposed");
  const composerList = board.lists.find((list) => list.id === composerListId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !onMoveCard) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCard = cards.find((card) => card.id === activeId);
    if (!activeCard) return;

    const targetListId =
      board.lists.find((list) => list.id === overId)?.id ??
      cards.find((card) => card.id === overId)?.listId;
    if (!targetListId) return;

    const columnCards = cards
      .filter((card) => card.listId === targetListId)
      .sort((left, right) =>
        compareRank(
          { rank: left.rank, id: left.id },
          { rank: right.rank, id: right.id },
        ),
      );

    const result = resolveDropRank({
      column: columnCards,
      activeId,
      overId,
    });
    if (!result) return;

    onMoveCard({ cardId: activeId, listId: targetListId, rank: result.rank });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Board Header Bar */}
      <div className="h-14 border-b border-border bg-sidebar/30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            {onSelectBoard && boards.length > 0 ? (
              <select
                value={board.id}
                onChange={(e) => onSelectBoard(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-base font-bold text-foreground focus:outline-none focus:border-primary/60"
              >
                {boards.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="text-base font-bold text-foreground">
                {board.title}
              </h1>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-2xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("columns")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "columns"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kanban Columns
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("goals")}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "goals"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Goals & Frameworks</span>
              {pendingGoals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-amber-950 font-bold text-3xs flex items-center justify-center">
                  {pendingGoals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onNewBoard && (
            <button
              type="button"
              data-testid="new-board"
              onClick={onNewBoard}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold hover:bg-primary/90 transition-colors"
            >
              + New Board
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFeedRulesOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-border bg-sidebar hover:bg-sidebar-accent text-2xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
          >
            <span>⚡ Feed Rules</span>
            {feedRules.some((r) => r.broken) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Surface */}
      <div className="flex-1 overflow-x-auto p-6 bg-background">
        {activeTab === "columns" && (
          <DndContext
            // Nested card+column droppables. Default rectIntersection prefers
            // the larger column, so every drop looks like an append (overId
            // becomes the list id). closestCorners lets over.id land on a card
            // when that is the target — the overload RANKING.md documents.
            collisionDetection={closestCorners}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full gap-4 items-start">
              {board.lists.map((list) => {
                const listCards = cards.filter((c) => c.listId === list.id);
                return (
                  <BoardColumn
                    key={list.id}
                    listId={list.id}
                    title={list.title}
                    cards={listCards}
                    approvalPendingByCardId={approvalPendingByCardId}
                    onSelectCard={(card) => setSelectedCardId(card.id)}
                    onAddCard={
                      onAddCard
                        ? (listId) => setComposerListId(listId)
                        : undefined
                    }
                    profiles={profiles}
                  />
                );
              })}
            </div>
          </DndContext>
        )}

        {activeTab === "goals" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Pending Comet Goal Proposals
            </h2>
            {pendingGoals.map((goal) => (
              <GoalDraftPanel
                key={goal.id}
                goal={goal}
                onApproveGoal={onApproveGoal}
                onRejectGoal={onRejectGoal}
              />
            ))}
            {pendingGoals.length === 0 && (
              <div className="text-center py-16 text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                No active Comet goal proposals requiring review.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Detail Modal Drawer */}
      <BoardCardModal
        card={selectedCard}
        requiresApproval={selectedRequiresApproval}
        isOpen={Boolean(selectedCard)}
        onClose={() => setSelectedCardId(null)}
        onApproveCard={onApproveCard}
        onRejectCard={onRejectCard}
        onAddComment={onAddComment}
        profiles={profiles}
      />

      {/* Feed Rules Config Modal */}
      <BoardFeedRulesModal
        rules={feedRules}
        isOpen={isFeedRulesOpen}
        onClose={() => setIsFeedRulesOpen(false)}
      />

      {/* Add Card Composer — keyed by board so a board switch resets drafts */}
      {onAddCard && (
        <CardComposerModal
          key={board.id}
          isOpen={Boolean(composerList)}
          listTitle={composerList?.title ?? ""}
          defaultBrand={board.brandScope}
          onClose={() => setComposerListId(null)}
          onAddCard={(draft) => {
            if (composerListId) onAddCard(composerListId, draft);
          }}
        />
      )}
    </div>
  );
};
